-- Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop the previous tsvector index as we'll use trgm for ilike optimization
DROP INDEX IF EXISTS idx_enrollment_search;

-- Create trigram indexes for the columns used in search
CREATE INDEX IF NOT EXISTS idx_enrollment_id_number_trgm ON public.enrollment_requests USING gin (id_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_enrollment_first_name_trgm ON public.enrollment_requests USING gin (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_enrollment_last_name_trgm ON public.enrollment_requests USING gin (last_name gin_trgm_ops);
