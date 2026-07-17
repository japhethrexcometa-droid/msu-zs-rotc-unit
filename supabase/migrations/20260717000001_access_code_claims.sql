-- Add claimed_at column
ALTER TABLE public.enrollment_access_codes ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Drop old constraint and add new one
DO $$ 
BEGIN
  -- We don't know the exact name if it was auto-generated, but it's likely enrollment_access_codes_status_check
  -- Let's find and drop it
  DECLARE
    v_conname TEXT;
  BEGIN
    SELECT conname INTO v_conname
    FROM pg_constraint
    WHERE conrelid = 'public.enrollment_access_codes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%';
      
    IF v_conname IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.enrollment_access_codes DROP CONSTRAINT ' || v_conname;
    END IF;
  END;
END $$;

ALTER TABLE public.enrollment_access_codes 
  ADD CONSTRAINT enrollment_access_codes_status_check 
  CHECK (status IN ('active', 'used', 'expired', 'revoked', 'claimed'));

-- Update verify_enrollment_access_code to claim the code
CREATE OR REPLACE FUNCTION public.verify_enrollment_access_code(
  p_access_code TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.enrollment_access_codes%ROWTYPE;
BEGIN
  -- We use FOR UPDATE SKIP LOCKED to prevent race conditions when multiple people try to verify the same code at the exact same millisecond
  SELECT *
    INTO v_record
  FROM public.enrollment_access_codes
  WHERE code = upper(trim(p_access_code))
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    -- Might be locked or genuinely invalid. Let's do a non-locking read.
    SELECT * INTO v_record FROM public.enrollment_access_codes WHERE code = upper(trim(p_access_code));
    IF NOT FOUND THEN
      RETURN json_build_object('valid', false, 'message', 'Invalid access code.');
    ELSE
      -- It's locked by another transaction right now
      RETURN json_build_object('valid', false, 'message', 'This code is currently being processed. Please wait a moment and try again.');
    END IF;
  END IF;

  IF v_record.status = 'used' THEN
    RETURN json_build_object('valid', false, 'message', 'This access code has already been used.');
  END IF;

  IF v_record.status = 'revoked' THEN
    RETURN json_build_object('valid', false, 'message', 'This access code has been revoked.');
  END IF;

  IF v_record.status = 'expired' OR v_record.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'message', 'This access code has expired.');
  END IF;

  IF v_record.status = 'claimed' THEN
    -- Check if the 15-minute reservation has expired
    IF v_record.claimed_at >= now() - interval '15 minutes' THEN
       RETURN json_build_object('valid', false, 'message', 'This code is currently reserved by someone else. Please try again in 15 minutes.');
    END IF;
    -- If > 15 minutes have passed, we can reclaim it!
  END IF;

  -- Claim the code
  UPDATE public.enrollment_access_codes
  SET status = 'claimed', 
      claimed_at = now()
  WHERE id = v_record.id;

  RETURN json_build_object('valid', true);
END;
$$;

NOTIFY pgrst, 'reload schema';
