-- Fix Admin Reset Password RPC to correctly update Supabase Auth instead of public.users
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_target_id UUID,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF p_new_password IS NULL OR length(trim(p_new_password)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Password cannot be empty.');
  END IF;

  -- Hash the new password and save it to the real Supabase Auth table
  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = p_target_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found in Auth system.');
  END IF;

  -- Update public.users timestamp just to trigger any necessary realtime syncs
  UPDATE public.users
  SET updated_at = now()
  WHERE id = p_target_id
  AND is_deleted = false;

  RETURN json_build_object('success', true);
END;
$$;
