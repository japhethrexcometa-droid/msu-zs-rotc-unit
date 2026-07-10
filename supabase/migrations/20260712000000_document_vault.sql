-- Document Vault: Storage for ROTC Manuals, Memo, and Forms
CREATE TABLE IF NOT EXISTS public.archived_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  display_name TEXT,
  original_name TEXT NOT NULL,
  folder_name TEXT NOT NULL DEFAULT 'Uncategorized',
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for Archived Documents
ALTER TABLE public.archived_documents ENABLE ROW LEVEL SECURITY;

-- Admins/Officers can do everything
CREATE POLICY "docs_admin_all" ON public.archived_documents
  FOR ALL TO authenticated USING (public.check_access());

-- Cadets can view/download public documents
-- Strictly Admin/Staff access only
CREATE POLICY "docs_cadet_select" ON public.archived_documents
  FOR SELECT TO authenticated
  USING (public.check_access());

-- Storage Bucket Configuration
-- Note: Bucket creation is usually done via Supabase Dashboard or API,
-- but we define the policy here assuming the 'vault' bucket exists.
CREATE POLICY "vault_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'vault' AND public.check_access());

CREATE POLICY "vault_cadet_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vault' AND public.check_access());

-- Index for fast searching
CREATE INDEX IF NOT EXISTS idx_docs_filename ON public.archived_documents USING gin (filename gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_docs_folder ON public.archived_documents(folder_name);
