-- Enforce bcrypt hash for the live admin account
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  -- Always ensure the admin account has the proper bcrypt hash for 'admin123'
  UPDATE public.users
  SET password_hash = crypt('admin123', gen_salt('bf')),
      is_active = true
  WHERE id_number = 'admin' OR lower(full_name) = 's1 admin';

  -- If it was somehow deleted, recreate it
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id_number = 'admin') THEN
    INSERT INTO public.users (
      id_number,
      full_name,
      role,
      is_active,
      password_hash,
      qr_token
    )
    VALUES (
      'admin',
      'S1 Admin',
      'admin',
      true,
      crypt('admin123', gen_salt('bf')),
      encode(gen_random_bytes(32), 'hex')
    );
  END IF;
END
$$;
