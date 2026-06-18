-- Create verify_login RPC for custom authentication
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.verify_login(
  p_id_number TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_user public.users%ROWTYPE;
  password_sha256 TEXT;
BEGIN
  -- Look up the user (case-insensitive on id_number)
  SELECT * INTO target_user 
  FROM public.users 
  WHERE lower(id_number) = lower(p_id_number)
  AND is_deleted = false;

  -- If user doesn't exist
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wrong ID number & password.');
  END IF;

  -- If user is inactive
  IF NOT target_user.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Account is deactivated.');
  END IF;

  -- Compute SHA-256 hash of the provided password
  -- pgcrypto lives in the extensions schema, so we set search_path above
  password_sha256 := encode(extensions.digest(p_password::bytea, 'sha256'), 'hex');

  -- Verify password hash
  IF lower(target_user.password_hash) = lower(password_sha256) THEN
    -- Success! Return user data
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', target_user.id,
        'id_number', target_user.id_number,
        'full_name', target_user.full_name,
        'role', target_user.role,
        'platoon', target_user.platoon,
        'photo_url', target_user.photo_url
      )
    );
  ELSE
    -- Wrong password
    RETURN json_build_object('success', false, 'error', 'Wrong password.');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_login(TEXT, TEXT) TO anon, authenticated;
