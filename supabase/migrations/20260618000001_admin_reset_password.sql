-- Admin Reset Password RPC
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_target_id UUID,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  password_sha256 TEXT;
BEGIN
  -- We rely on the frontend to only expose this to Admins, 
  -- but we could add additional caller checks here if using Supabase Auth.
  
  IF p_new_password IS NULL OR length(trim(p_new_password)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Password cannot be empty.');
  END IF;

  -- Hash the new password
  password_sha256 := encode(extensions.digest(p_new_password::bytea, 'sha256'), 'hex');

  -- Update the user's password
  UPDATE public.users
  SET 
    password_hash = password_sha256,
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
