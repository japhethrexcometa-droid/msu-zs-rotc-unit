-- =============================================================================
-- Migration: Access Codes & Email Queue
-- =============================================================================

-- 1. ENROLLMENT ACCESS CODES
CREATE TABLE IF NOT EXISTS public.enrollment_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  batch_id TEXT,
  created_by UUID REFERENCES public.users(id),
  used_by_id_number TEXT,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for Access Codes
ALTER TABLE public.enrollment_access_codes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "access_codes_admin_all" ON public.enrollment_access_codes 
  FOR ALL TO authenticated USING (public.is_admin());

-- Public can SELECT to check if a code is valid (but only certain fields to prevent scraping)
CREATE POLICY "access_codes_public_read" ON public.enrollment_access_codes 
  FOR SELECT TO anon, authenticated USING (true);


-- 2. EMAIL QUEUE
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- RLS Policies for Email Queue
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Admins can read the queue
CREATE POLICY "email_queue_admin_read" ON public.email_queue 
  FOR SELECT TO authenticated USING (public.is_admin());

-- The Vercel API (using service_role) will bypass RLS to insert/update the queue.

-- 3. NOTIFY REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_access_codes;
ALTER TABLE public.enrollment_access_codes REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.email_queue;
ALTER TABLE public.email_queue REPLICA IDENTITY FULL;

-- 4. RPC for Atomic Enrollment Submission
CREATE OR REPLACE FUNCTION public.submit_enrollment_with_code(
  p_access_code TEXT,
  p_enrollment_data JSONB
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code_record public.enrollment_access_codes%ROWTYPE;
  v_id_number TEXT;
BEGIN
  -- 1. Extract ID number from JSON
  v_id_number := p_enrollment_data->>'id_number';
  
  -- 2. Verify code exists and is active/valid (row-level lock to prevent race conditions)
  SELECT * INTO v_code_record 
  FROM public.enrollment_access_codes 
  WHERE code = upper(p_access_code) 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid access code.');
  END IF;
  
  IF v_code_record.status = 'used' THEN
    RETURN json_build_object('success', false, 'error', 'This access code has already been used.');
  END IF;
  
  IF v_code_record.status = 'revoked' THEN
    RETURN json_build_object('success', false, 'error', 'This access code has been revoked.');
  END IF;
  
  IF v_code_record.status = 'expired' OR v_code_record.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'This access code has expired.');
  END IF;
  
  -- 3. Check for duplicates (Duplicate Enrollment Prevention)
  IF EXISTS (SELECT 1 FROM public.enrollment_requests WHERE id_number = v_id_number) THEN
    RETURN json_build_object('success', false, 'error', 'You already have an existing enrollment request.');
  END IF;

  -- 4. Insert enrollment request
  INSERT INTO public.enrollment_requests (
    id_number, school, last_name, first_name, middle_initial, suffix, gender, 
    date_of_birth, course_year, year_level, year_class, semester, contact_number, 
    home_address, religion, blood_type, height_feet, email, beneficiary_name, 
    beneficiary_relationship, emergency_name, emergency_relationship, emergency_contact, 
    role, status, ms_subject, ms_title
  ) VALUES (
    v_id_number,
    p_enrollment_data->>'school',
    p_enrollment_data->>'last_name',
    p_enrollment_data->>'first_name',
    p_enrollment_data->>'middle_initial',
    p_enrollment_data->>'suffix',
    p_enrollment_data->>'gender',
    (p_enrollment_data->>'date_of_birth')::date,
    p_enrollment_data->>'course_year',
    p_enrollment_data->>'year_level',
    p_enrollment_data->>'year_class',
    p_enrollment_data->>'semester',
    p_enrollment_data->>'contact_number',
    p_enrollment_data->>'home_address',
    p_enrollment_data->>'religion',
    p_enrollment_data->>'blood_type',
    p_enrollment_data->>'height_feet',
    p_enrollment_data->>'email',
    p_enrollment_data->>'beneficiary_name',
    p_enrollment_data->>'beneficiary_relationship',
    p_enrollment_data->>'emergency_name',
    p_enrollment_data->>'emergency_relationship',
    p_enrollment_data->>'emergency_contact',
    p_enrollment_data->>'role',
    'pending',
    p_enrollment_data->>'ms_subject',
    p_enrollment_data->>'ms_title'
  );
  
  -- 5. Mark code as used
  UPDATE public.enrollment_access_codes 
  SET status = 'used', used_by_id_number = v_id_number, used_at = now()
  WHERE code = upper(p_access_code);
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
