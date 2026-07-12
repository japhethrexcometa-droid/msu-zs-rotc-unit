-- Add performance indexes for Enrollment Requests
CREATE INDEX IF NOT EXISTS idx_enrollment_status ON public.enrollment_requests(status);
CREATE INDEX IF NOT EXISTS idx_enrollment_school ON public.enrollment_requests(school);
CREATE INDEX IF NOT EXISTS idx_enrollment_created_at ON public.enrollment_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrollment_search ON public.enrollment_requests USING gin (
  to_tsvector('english', id_number || ' ' || first_name || ' ' || last_name)
);

-- Index for existing account checks
CREATE INDEX IF NOT EXISTS idx_users_id_number ON public.users(id_number);
