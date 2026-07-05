-- =============================================================================
-- Add missing year_level and year_class columns to enrollment_requests
-- =============================================================================
-- The enrollment form sends year_level (e.g. '1st Year') and year_class
-- (e.g. 'Basic Cadet', '2nd Class (2CL)', '1st Class (1CL)') but these
-- columns were never created in the original table definition.
-- PostgREST rejects inserts containing unknown columns, causing officer
-- (and potentially cadet) enrollments to silently fail.

ALTER TABLE public.enrollment_requests
  ADD COLUMN IF NOT EXISTS year_level TEXT,
  ADD COLUMN IF NOT EXISTS year_class TEXT;

-- Notify PostgREST to reload the schema cache so it instantly recognizes the new columns
NOTIFY pgrst, 'reload schema';
