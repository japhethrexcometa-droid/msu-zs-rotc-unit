-- Rotation migration: rotate QR tokens for cadets and officers
-- 1) Creates a log table storing old/new tokens for rollback/audit
-- 2) Generates new secure tokens for all users with role IN ('cadet','officer')

-- Ensure pgcrypto extension is available (no-op if already present)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Audit table to store previous and new tokens (one row per user)
CREATE TABLE IF NOT EXISTS public.qr_token_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  old_token TEXT,
  new_token TEXT,
  rotated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert current tokens to the log for users we will rotate
INSERT INTO public.qr_token_rotation_log (user_id, old_token)
SELECT id, qr_token FROM public.users WHERE role IN ('cadet','officer');

-- Generate new secure tokens (hex-encoded 16 bytes) and write to users table
UPDATE public.users
SET qr_token = encode(gen_random_bytes(16), 'hex')
WHERE role IN ('cadet','officer');

-- Populate the log with the new token values
UPDATE public.qr_token_rotation_log l
SET new_token = u.qr_token
FROM public.users u
WHERE l.user_id = u.id;

-- Optional: Verify uniqueness
-- SELECT count(*) FROM public.users WHERE role IN ('cadet','officer');
-- SELECT count(DISTINCT qr_token) FROM public.users WHERE role IN ('cadet','officer');

-- ROLLBACK guidance (manual):
-- To revert, use the mapping in public.qr_token_rotation_log and run:
-- UPDATE public.users u
-- SET qr_token = l.old_token
-- FROM public.qr_token_rotation_log l
-- WHERE u.id = l.user_id AND l.new_token = u.qr_token;

-- IMPORTANT: Back up your database before running this migration.
