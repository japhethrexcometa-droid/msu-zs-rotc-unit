-- Create full enrollment_requests table
CREATE TABLE IF NOT EXISTS public.enrollment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_number TEXT NOT NULL UNIQUE,
  school TEXT NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_initial TEXT,
  suffix TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
  date_of_birth DATE NOT NULL,
  course_year TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  home_address TEXT NOT NULL,
  religion TEXT,
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')),
  height_feet TEXT,
  email TEXT NOT NULL,
  beneficiary_name TEXT,
  beneficiary_relationship TEXT,
  emergency_name TEXT NOT NULL,
  emergency_relationship TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  ms_subject TEXT NOT NULL DEFAULT 'MS1',
  ms_title TEXT NOT NULL DEFAULT 'Military Science 1',
  semester TEXT NOT NULL DEFAULT '1st Semester',
  role TEXT DEFAULT 'cadet',
  platoon TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  email_sent BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (for public enrollment form)
CREATE POLICY "enrollment_insert_anon" ON public.enrollment_requests FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');

-- Only admins/officers can view and update
CREATE POLICY "enrollment_select_admin" ON public.enrollment_requests FOR SELECT TO anon USING (public.check_access());
CREATE POLICY "enrollment_update_admin" ON public.enrollment_requests FOR UPDATE TO anon USING (public.check_access()) WITH CHECK (public.check_access());

-- Approve Enrollment RPC
-- This creates the user account and marks the request as approved.
CREATE OR REPLACE FUNCTION public.approve_enrollment(
  p_request_id UUID,
  p_reviewer_id UUID
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  req_rec public.enrollment_requests%ROWTYPE;
  new_user_id UUID;
  new_token TEXT;
  seq_val INT;
  dup_exists BOOLEAN;
  temp_password_hash TEXT;
BEGIN
  -- 1. Get the request
  SELECT * INTO req_rec FROM public.enrollment_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found or already processed.');
  END IF;

  -- 2. Check if ID number already exists in users
  IF EXISTS(SELECT 1 FROM public.users WHERE id_number = req_rec.id_number) THEN
    RETURN json_build_object('success', false, 'error', 'User with this ID Number already exists.');
  END IF;

  -- 3. Generate QR Token
  LOOP
    seq_val := nextval('cadet_token_seq');
    new_token := 'CD' || lpad(seq_val::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.users WHERE short_token = new_token) INTO dup_exists;
    EXIT WHEN NOT dup_exists;
  END LOOP;

  -- 4. Hash the password (ID Number) using bcrypt
  temp_password_hash := crypt(req_rec.id_number, gen_salt('bf'));

  -- 5. Insert into users
  INSERT INTO public.users (
    id_number, full_name, role, platoon, gender, school, 
    password_hash, qr_token, short_token, is_active
  ) VALUES (
    req_rec.id_number, 
    req_rec.first_name || ' ' || COALESCE(req_rec.middle_initial || '. ', '') || req_rec.last_name || CASE WHEN req_rec.suffix IS NOT NULL AND req_rec.suffix <> 'N/A' AND req_rec.suffix <> '' THEN ' ' || req_rec.suffix ELSE '' END, 
    COALESCE(req_rec.role, 'cadet'), 
    req_rec.platoon, 
    req_rec.gender, 
    req_rec.school, 
    temp_password_hash, 
    new_token, 
    new_token, 
    true
  ) RETURNING id INTO new_user_id;

  -- 6. Log token generation
  INSERT INTO public.token_generation_log (user_id, role, token) VALUES (new_user_id, COALESCE(req_rec.role, 'cadet'), new_token);

  -- 7. Update request status
  UPDATE public.enrollment_requests 
  SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = now()
  WHERE id = p_request_id;

  RETURN json_build_object('success', true, 'user_id', new_user_id, 'email', req_rec.email, 'id_number', req_rec.id_number);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant permissions so the frontend can interact with the table and sequence
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_requests TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.cadet_token_seq TO anon, authenticated;
