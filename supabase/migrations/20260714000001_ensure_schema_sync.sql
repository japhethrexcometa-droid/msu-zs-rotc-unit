-- Final Schema Synchronization & Integrity Check
-- This ensures all necessary tables and columns exist and triggers a schema reload.

-- 1. Ensure display_name exists on archived_documents
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='archived_documents' AND column_name='display_name') THEN
        ALTER TABLE public.archived_documents ADD COLUMN display_name TEXT;
    END IF;
END $$;

-- 2. Force a schema reload notification
NOTIFY pgrst, 'reload schema';

-- 3. Ensure enrollment_archives exists with correct staff permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'enrollment_archives') THEN
        CREATE TABLE public.enrollment_archives (
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

        ALTER TABLE public.enrollment_archives ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "archives_select_staff" ON public.enrollment_archives
          FOR SELECT TO authenticated USING (public.is_staff());

        CREATE POLICY "archives_all_admin" ON public.enrollment_archives
          FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
    END IF;
END $$;

-- 4. Final Notification
NOTIFY pgrst, 'reload schema';
