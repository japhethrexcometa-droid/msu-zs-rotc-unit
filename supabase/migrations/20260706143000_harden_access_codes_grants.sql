-- Follow-up hardening for access codes after 20260705210000.
-- Adds explicit API grants for current Supabase behavior and removes public
-- table reads in favor of a narrow verification RPC.

-- Access-code management is admin-only through RLS, but PostgREST also needs
-- explicit privileges on newer Supabase projects.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_access_codes TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.enrollment_access_codes FROM anon;

GRANT SELECT ON public.email_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_queue TO service_role;

DROP POLICY IF EXISTS "access_codes_public_read" ON public.enrollment_access_codes;

-- Public callers can only verify one provided code. They cannot list or scrape
-- the enrollment_access_codes table.
CREATE OR REPLACE FUNCTION public.verify_enrollment_access_code(
  p_access_code TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT status, expires_at
    INTO v_status, v_expires_at
  FROM public.enrollment_access_codes
  WHERE code = upper(trim(p_access_code));

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'message', 'Invalid access code.');
  END IF;

  IF v_status = 'used' THEN
    RETURN json_build_object('valid', false, 'message', 'This access code has already been used.');
  END IF;

  IF v_status = 'revoked' THEN
    RETURN json_build_object('valid', false, 'message', 'This access code has been revoked.');
  END IF;

  IF v_status = 'expired' OR v_expires_at < now() THEN
    RETURN json_build_object('valid', false, 'message', 'This access code has expired.');
  END IF;

  RETURN json_build_object('valid', true);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_enrollment_access_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_enrollment_access_code(TEXT) TO anon, authenticated;

-- Replace the original submission RPC with stronger duplicate protection and
-- stricter role validation. The access-code row lock prevents a code from being
-- used twice; the advisory lock serializes submissions for the same ID number.
CREATE OR REPLACE FUNCTION public.submit_enrollment_with_code(
  p_access_code TEXT,
  p_enrollment_data JSONB
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record public.enrollment_access_codes%ROWTYPE;
  v_id_number TEXT;
  v_role TEXT;
BEGIN
  v_id_number := upper(trim(p_enrollment_data->>'id_number'));
  v_role := lower(trim(p_enrollment_data->>'role'));

  IF v_id_number IS NULL OR v_id_number = '' THEN
    RETURN json_build_object('success', false, 'error', 'Student ID number is required.');
  END IF;

  IF v_role NOT IN ('cadet', 'officer') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid enrollment role.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_id_number, 0));

  SELECT *
    INTO v_code_record
  FROM public.enrollment_access_codes
  WHERE code = upper(trim(p_access_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid access code.');
  END IF;

  IF v_code_record.status = 'used' THEN
    RETURN json_build_object('success', false, 'error', 'This access code has already been used.');
  END IF;

  IF v_code_record.status = 'revoked' THEN
    RETURN json_build_object('success', false, 'error', 'This access code has been revoked.');
  END IF;

  IF v_code_record.status = 'expired' OR v_code_record.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'This access code has expired.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.enrollment_requests
    WHERE upper(trim(id_number)) = v_id_number
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You already have an existing enrollment request.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE upper(trim(id_number)) = v_id_number
  ) THEN
    RETURN json_build_object('success', false, 'error', 'This ID number is already registered.');
  END IF;

  INSERT INTO public.enrollment_requests (
    id_number, school, last_name, first_name, middle_initial, suffix, gender,
    date_of_birth, course_year, year_level, year_class, semester, contact_number,
    home_address, religion, blood_type, height_feet, email, beneficiary_name,
    beneficiary_relationship, emergency_name, emergency_relationship, emergency_contact,
    role, status, ms_subject, ms_title
  ) VALUES (
    v_id_number,
    p_enrollment_data->>'school',
    p_enrollment_data->>'last_name',
    p_enrollment_data->>'first_name',
    p_enrollment_data->>'middle_initial',
    p_enrollment_data->>'suffix',
    p_enrollment_data->>'gender',
    (p_enrollment_data->>'date_of_birth')::date,
    p_enrollment_data->>'course_year',
    p_enrollment_data->>'year_level',
    p_enrollment_data->>'year_class',
    p_enrollment_data->>'semester',
    p_enrollment_data->>'contact_number',
    p_enrollment_data->>'home_address',
    p_enrollment_data->>'religion',
    p_enrollment_data->>'blood_type',
    p_enrollment_data->>'height_feet',
    p_enrollment_data->>'email',
    p_enrollment_data->>'beneficiary_name',
    p_enrollment_data->>'beneficiary_relationship',
    p_enrollment_data->>'emergency_name',
    p_enrollment_data->>'emergency_relationship',
    p_enrollment_data->>'emergency_contact',
    v_role,
    'pending',
    p_enrollment_data->>'ms_subject',
    p_enrollment_data->>'ms_title'
  );

  UPDATE public.enrollment_access_codes
  SET status = 'used',
      used_by_id_number = v_id_number,
      used_at = now()
  WHERE id = v_code_record.id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_enrollment_with_code(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_enrollment_with_code(TEXT, JSONB) TO anon, authenticated;
