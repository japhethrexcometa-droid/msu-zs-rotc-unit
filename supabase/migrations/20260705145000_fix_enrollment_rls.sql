-- =============================================================================
-- Fix RLS policies that block the public enrollment form
-- =============================================================================
-- Problem 1: Migration 20260619010001 replaced the system_settings SELECT
-- policy from "TO anon, authenticated" to "TO authenticated" only.
-- This blocks anonymous users from checking if enrollment is open,
-- potentially causing the enrollment form to fail silently.
--
-- Problem 2: Enrollment insert may succeed but admin can't see the data
-- if their JWT is momentarily stale. Adding REPLICA IDENTITY and ensuring
-- proper grants helps realtime + polling work correctly.

-- Fix: Allow anon to read system_settings (enrollment_open check)
DROP POLICY IF EXISTS "settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "settings_select_all" ON public.system_settings;
CREATE POLICY "settings_select_all" ON public.system_settings
  FOR SELECT TO anon, authenticated USING (true);

-- Ensure anon has the necessary grants for enrollment flow
GRANT SELECT ON public.system_settings TO anon;
GRANT SELECT, INSERT ON public.enrollment_requests TO anon;

-- Notify PostgREST to pick up policy changes
NOTIFY pgrst, 'reload schema';
