-- Add optimized search column
ALTER TABLE public.enrollment_requests
ADD COLUMN IF NOT EXISTS search_text TEXT GENERATED ALWAYS AS (
  id_number || ' ' || first_name || ' ' || last_name
) STORED;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_enrollment_search_text_trgm
ON public.enrollment_requests USING gin (search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_enrollment_id_number_fast
ON public.enrollment_requests(id_number text_pattern_ops);
