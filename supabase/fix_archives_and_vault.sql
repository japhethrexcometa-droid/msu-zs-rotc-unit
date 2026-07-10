-- MANUAL FIX: Run this in Supabase SQL Editor to fix Archives & Vault
-- This creates the missing tables and ensures all permissions are correct.

-- 1. Create enrollment_archives
CREATE TABLE IF NOT EXISTS public.enrollment_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_number TEXT NOT NULL,
  school TEXT NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_initial TEXT,
  suffix TEXT,
  gender TEXT NOT NULL,
  date_of_birth DATE,
  course_year TEXT,
  year_level TEXT,
  year_class TEXT,
  contact_number TEXT,
  home_address TEXT,
  religion TEXT,
  blood_type TEXT,
  height_feet TEXT,
  email TEXT,
  beneficiary_name TEXT,
  beneficiary_relationship TEXT,
  emergency_name TEXT,
  emergency_relationship TEXT,
  emergency_contact TEXT,
  ms_subject TEXT,
  ms_title TEXT,
  semester TEXT,
  academic_year TEXT NOT NULL,
  role TEXT,
  platoon TEXT,
  status TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  original_created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT now(),
  archived_by UUID REFERENCES public.users(id)
);

-- 2. Create archived_documents
CREATE TABLE IF NOT EXISTS public.archived_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  display_name TEXT,
  original_name TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id)
);

-- 3. Enable RLS
ALTER TABLE public.enrollment_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_documents ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Ensuring is_staff() and is_admin() exist)
-- Re-create helper functions if they are missing
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'officer'));
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Archives Policies
DROP POLICY IF EXISTS "archives_select_staff" ON public.enrollment_archives;
CREATE POLICY "archives_select_staff" ON public.enrollment_archives
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "archives_all_admin" ON public.enrollment_archives;
CREATE POLICY "archives_all_admin" ON public.enrollment_archives
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Documents Policies
DROP POLICY IF EXISTS "docs_select_staff" ON public.archived_documents;
CREATE POLICY "docs_select_staff" ON public.archived_documents
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "docs_all_staff" ON public.archived_documents;
CREATE POLICY "docs_all_staff" ON public.archived_documents
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 5. Fix Storage Policies for 'vault' bucket
-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
SELECT 'vault', 'vault', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'vault');

DROP POLICY IF EXISTS "vault_staff_insert" ON storage.objects;
CREATE POLICY "vault_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vault' AND public.is_staff());

DROP POLICY IF EXISTS "vault_staff_select" ON storage.objects;
CREATE POLICY "vault_staff_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vault' AND public.is_staff());

DROP POLICY IF EXISTS "vault_staff_update" ON storage.objects;
CREATE POLICY "vault_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vault' AND public.is_staff())
  WITH CHECK (bucket_id = 'vault' AND public.is_staff());

DROP POLICY IF EXISTS "vault_staff_delete" ON storage.objects;
CREATE POLICY "vault_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vault' AND public.is_staff());

-- 6. Reload Schema
NOTIFY pgrst, 'reload schema';
