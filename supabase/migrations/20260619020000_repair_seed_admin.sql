-- =============================================================================
-- Repair Migration: Seed Admin after partial migration failure
-- =============================================================================
-- The previous migration (20260619010000) partially applied:
--   ✅ Truncated tables
--   ✅ Linked public.users to auth.users  
--   ✅ Dropped password_hash column
--   ✅ Dropped obsolete RPCs
--   ❌ Failed on gen_salt() because pgcrypto extension was dropped
--
-- This migration completes the admin seeding using the extensions schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Seed Admin into auth.users and public.users
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
    '00000000-0000-0000-0000-000000000000', admin_uid, 'authenticated', 'authenticated', admin_email, 
    extensions.crypt('admin123', extensions.gen_salt('bf')), now(),
    now(), now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  );

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), admin_uid, admin_uid::text, format('{"sub":"%s","email":"%s"}', admin_uid::text, admin_email)::jsonb, 'email', now(), now(), now()
  );

  -- Insert into public.users
  INSERT INTO public.users (
    id, id_number, full_name, role, is_active, qr_token, short_token
  ) VALUES (
    admin_uid, 'admin', 'System Administrator', 'admin', true, 'ADMIN_QR_TOKEN', 'ADMIN_QR_TOKEN'
  );
END $$;
