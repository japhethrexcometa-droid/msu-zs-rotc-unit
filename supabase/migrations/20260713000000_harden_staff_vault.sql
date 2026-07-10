-- Add display_name to archived_documents for flexible naming
ALTER TABLE public.archived_documents ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Harden Archives & Document Vault access for Staff (Admin/Officer)
-- This ensures that members/cadets cannot see these records/files unless explicitly intended.

-- 1. Unify archives access to use is_staff() instead of is_admin()
-- 1. Unify archives access to use is_admin()
DROP POLICY IF EXISTS "archives_select_staff" ON public.enrollment_archives;
CREATE POLICY "archives_select_staff" ON public.enrollment_archives
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "archives_all_admin" ON public.enrollment_archives;
CREATE POLICY "archives_all_admin" ON public.enrollment_archives
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. Harden Document Vault access (Strictly Admin)
DROP POLICY IF EXISTS "docs_admin_all" ON public.archived_documents;
CREATE POLICY "docs_admin_all" ON public.archived_documents
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "docs_staff_select" ON public.archived_documents;
CREATE POLICY "docs_staff_select" ON public.archived_documents
  FOR SELECT TO authenticated USING (public.is_admin());

-- 3. Storage Policies (Strictly Admin)
DROP POLICY IF EXISTS "vault_admin_all" ON storage.objects;
CREATE POLICY "vault_staff_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'vault' AND public.is_admin());

DROP POLICY IF EXISTS "vault_staff_select" ON storage.objects;
CREATE POLICY "vault_staff_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vault' AND public.is_admin());

NOTIFY pgrst, 'reload schema';
