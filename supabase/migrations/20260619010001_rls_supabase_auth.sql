-- =============================================================================
-- Migration: Replace custom check_access() RLS with proper Supabase Auth RLS
-- =============================================================================
-- Now that we use Supabase Auth, we can use auth.uid() natively in policies.
-- The old check_access() just returned TRUE for everyone — a massive security hole.
-- This migration replaces all policies to use proper role-based access control.

-- Helper: Get the role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Helper: Check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Helper: Check if the current user is an admin or officer
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'officer'));
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ========================
-- USERS TABLE
-- ========================
-- Drop all old policies
DROP POLICY IF EXISTS "Users are readable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update their own photo" ON public.users;
DROP POLICY IF EXISTS "users_insert_gateway" ON public.users;
DROP POLICY IF EXISTS "users_update_gateway" ON public.users;
DROP POLICY IF EXISTS "users_delete_gateway" ON public.users;
DROP POLICY IF EXISTS "users_anon_delete" ON public.users;

-- New policies for authenticated users
CREATE POLICY "users_select_authenticated" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert_admin" ON public.users FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "users_update_self_or_admin" ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE TO authenticated USING (public.is_admin());

-- Anon can still read users (for the enrollment form to check ID uniqueness)
CREATE POLICY "users_select_anon" ON public.users FOR SELECT TO anon USING (true);

-- ========================
-- SESSIONS TABLE
-- ========================
DROP POLICY IF EXISTS "Sessions are readable by everyone" ON public.sessions;
DROP POLICY IF EXISTS "sessions_select_gateway" ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert_gateway" ON public.sessions;
DROP POLICY IF EXISTS "sessions_update_gateway" ON public.sessions;
DROP POLICY IF EXISTS "sessions_delete_gateway" ON public.sessions;

CREATE POLICY "sessions_select" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_insert_staff" ON public.sessions FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "sessions_update_staff" ON public.sessions FOR UPDATE TO authenticated USING (public.is_staff());
CREATE POLICY "sessions_delete_admin" ON public.sessions FOR DELETE TO authenticated USING (public.is_admin());

-- ========================
-- ATTENDANCE TABLE
-- ========================
DROP POLICY IF EXISTS "Allow reading attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins and officers can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_gateway" ON public.attendance;
DROP POLICY IF EXISTS "attendance_update_gateway" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_anon" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_gateway" ON public.attendance;

CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_insert_staff" ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "attendance_update_staff" ON public.attendance FOR UPDATE TO authenticated USING (public.is_staff());

-- ========================
-- ENROLLMENT REQUESTS TABLE
-- ========================
DROP POLICY IF EXISTS "enrollment_insert_anon" ON public.enrollment_requests;
DROP POLICY IF EXISTS "enrollment_select_admin" ON public.enrollment_requests;
DROP POLICY IF EXISTS "enrollment_update_admin" ON public.enrollment_requests;

-- Anon can insert (public enrollment form, no login required)
CREATE POLICY "enrollment_insert_public" ON public.enrollment_requests FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');
-- Only authenticated admins can read/update
CREATE POLICY "enrollment_select_auth" ON public.enrollment_requests FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "enrollment_update_auth" ON public.enrollment_requests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========================
-- ANNOUNCEMENTS TABLE
-- ========================
DROP POLICY IF EXISTS "announcements_select_gateway" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_gateway" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_gateway" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_gateway" ON public.announcements;

CREATE POLICY "announcements_select" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_insert_staff" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "announcements_update_staff" ON public.announcements FOR UPDATE TO authenticated USING (public.is_staff());
CREATE POLICY "announcements_delete_admin" ON public.announcements FOR DELETE TO authenticated USING (public.is_admin());

-- ========================
-- SCAN AUDIT LOGS TABLE
-- ========================
DROP POLICY IF EXISTS "audit_select_admin" ON public.scan_audit_logs;
DROP POLICY IF EXISTS "audit_insert_anon" ON public.scan_audit_logs;

CREATE POLICY "audit_select_admin" ON public.scan_audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "audit_insert_auth" ON public.scan_audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- ========================
-- SYSTEM SETTINGS TABLE
-- ========================
DROP POLICY IF EXISTS "settings_select_all" ON public.system_settings;
DROP POLICY IF EXISTS "settings_update_admin" ON public.system_settings;
DROP POLICY IF EXISTS "settings_insert_admin" ON public.system_settings;

CREATE POLICY "settings_select" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_update_admin" ON public.system_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "settings_insert_admin" ON public.system_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ========================
-- STORAGE: Update photo upload to use auth.uid()
-- ========================
DROP POLICY IF EXISTS "Users can upload their own photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photo" ON storage.objects;

CREATE POLICY "Authenticated upload photo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cadet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated update photo" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cadet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========================
-- GRANTS: Switch from anon to authenticated
-- ========================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.enrollment_requests TO authenticated;
GRANT INSERT ON public.enrollment_requests TO anon;

-- Keep check_access() as a backward-compatible stub but it now checks auth
CREATE OR REPLACE FUNCTION public.check_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
