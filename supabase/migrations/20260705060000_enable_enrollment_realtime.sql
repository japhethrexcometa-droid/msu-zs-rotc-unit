-- =============================================================================
-- Enable Supabase Realtime for enrollment_requests table
-- =============================================================================
-- Supabase Realtime requires tables to be explicitly added to the
-- supabase_realtime publication. Without this, postgres_changes events
-- for enrollment_requests will never fire, meaning the admin panel
-- won't receive real-time updates when new enrollments are submitted.

-- Add enrollment_requests to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_requests;

-- Set REPLICA IDENTITY to FULL so UPDATE/DELETE events include the full row
-- (default is only the primary key, which isn't enough for our client to
-- identify which row changed)
ALTER TABLE public.enrollment_requests REPLICA IDENTITY FULL;
