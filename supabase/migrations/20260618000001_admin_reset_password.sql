-- Admin Reset Password RPC (bcrypt only — engineering standard)
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
