-- Explicitly define and harden storage policies for the 'vault' bucket.
-- These resolve "new row violates row-level security policy" errors during upload.

-- 1. DROP EXISTING TO ENSURE CLEAN STATE
DROP POLICY IF EXISTS "vault_staff_all" ON storage.objects;
DROP POLICY IF EXISTS "vault_staff_select" ON storage.objects;
DROP POLICY IF EXISTS "vault_admin_all" ON storage.objects;
DROP POLICY IF EXISTS "vault_cadet_select" ON storage.objects;

-- 2. CREATE COMPREHENSIVE STAFF POLICIES
-- NOTE: Supabase Storage requires BOTH USING and WITH CHECK for INSERT/UPDATE

CREATE POLICY "vault_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vault' AND public.is_staff());

CREATE POLICY "vault_staff_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vault' AND public.is_staff());

CREATE POLICY "vault_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vault' AND public.is_staff())
  WITH CHECK (bucket_id = 'vault' AND public.is_staff());

CREATE POLICY "vault_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vault' AND public.is_staff());

-- 3. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
