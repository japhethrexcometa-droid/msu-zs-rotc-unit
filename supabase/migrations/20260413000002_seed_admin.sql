-- =============================================================================
-- Seed: Admin and initial officer accounts (bcrypt only — engineering standard)
-- =============================================================================
-- This migration inserts the default admin account and a placeholder officer
-- account. Both are idempotent via ON CONFLICT (id_number) DO NOTHING.
--
-- Credentials:
--   admin     → password: admin123   (bcrypt hashed via pgcrypto)
--   officer01 → password: TES0001    (bcrypt hashed via pgcrypto)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Admin account
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
)
ON CONFLICT (id_number) DO NOTHING;

-- Test officer account
INSERT INTO public.users (
  id_number,
  full_name,
  role,
  is_active,
  password_hash,
  qr_token
)
VALUES (
  'officer01',
  'Test Officer',
  'officer',
  true,
  crypt('TES0001', gen_salt('bf')),
  encode(gen_random_bytes(32), 'hex')
)
ON CONFLICT (id_number) DO NOTHING;
