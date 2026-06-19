-- Unify all password handling to use bcrypt via pgcrypto (pure bcrypt, no SHA-256 fallback)
-- This is the final, authoritative version of verify_login and admin_reset_user_password.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. verify_login — pure bcrypt only
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

  -- Verify password with bcrypt
  IF crypt(p_password, target_user.password_hash) = target_user.password_hash THEN
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
    RETURN json_build_object('success', false, 'error', 'Wrong password.');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_login(TEXT, TEXT) TO anon, authenticated;

-- 2. admin_reset_user_password — pure bcrypt only
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_target_id UUID,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_new_password IS NULL OR length(trim(p_new_password)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Password cannot be empty.');
  END IF;

  -- Hash the new password with bcrypt
  UPDATE public.users
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = p_target_id
  AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found or is deleted.');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO anon, authenticated;
