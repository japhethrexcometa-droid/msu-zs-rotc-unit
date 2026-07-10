-- =============================================================================
-- Create enrollment_archives table for historical records
-- =============================================================================
-- This table stores historical enrollment data grouped by academic year.
-- It mirrors enrollment_requests but is intended for long-term storage and
-- CHED compliance.

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
  academic_year TEXT NOT NULL, -- e.g. "2023-2024" or "2020"
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

-- Index for folder-like grouping and fast searching
CREATE INDEX idx_enroll_archives_ay ON public.enrollment_archives(academic_year);
CREATE INDEX idx_enroll_archives_name ON public.enrollment_archives(last_name, first_name);
CREATE INDEX idx_enroll_archives_id_number ON public.enrollment_archives(id_number);

-- RLS Policies
ALTER TABLE public.enrollment_archives ENABLE ROW LEVEL SECURITY;

-- Only staff can view historical records
CREATE POLICY "archives_select_staff" ON public.enrollment_archives
  FOR SELECT TO authenticated USING (public.is_admin());

-- Only admins can insert/delete (archive/import)
CREATE POLICY "archives_all_admin" ON public.enrollment_archives
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
