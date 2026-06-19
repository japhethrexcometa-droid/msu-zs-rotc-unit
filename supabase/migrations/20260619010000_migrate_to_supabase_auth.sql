-- =============================================================================
-- Migration: Migrate to Supabase Auth
-- =============================================================================

-- 1. Wipe existing tables that depend on users due to Auth migration
TRUNCATE TABLE public.attendance CASCADE;
TRUNCATE TABLE public.enrollment_requests CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- 2. Link public.users to auth.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE public.users ADD PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Drop custom password logic
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- 4. Drop obsolete RPCs that reference password_hash or custom auth
DROP FUNCTION IF EXISTS public.verify_login;
DROP FUNCTION IF EXISTS public.admin_reset_user_password;
DROP FUNCTION IF EXISTS public.approve_enrollment;
DROP FUNCTION IF EXISTS public.bulk_enroll_users;
DROP FUNCTION IF EXISTS public.update_cadet_photo_with_creds;

-- 5. Seed Admin into auth.users and public.users
DO $$
DECLARE
  admin_uid UUID := gen_random_uuid();
  admin_email TEXT := 'admin@rotc.msubuug.edu.ph';
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', admin_uid, 'authenticated', 'authenticated', admin_email, crypt('admin123', gen_salt('bf')), now(),
    now(), now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  );

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), admin_uid, format('{"sub":"%s","email":"%s"}', admin_uid::text, admin_email)::jsonb, 'email', now(), now(), now()
  );

  -- Insert into public.users
  INSERT INTO public.users (
    id, id_number, full_name, role, is_active, qr_token, short_token
  ) VALUES (
    admin_uid, 'admin', 'System Administrator', 'admin', true, 'ADMIN_QR_TOKEN', 'ADMIN_QR_TOKEN'
  );
END $$;
