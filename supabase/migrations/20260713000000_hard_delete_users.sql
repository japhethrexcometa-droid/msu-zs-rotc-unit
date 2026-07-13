-- =============================================================================
-- Hard Delete Users RPC
-- =============================================================================
-- This function permanently removes users and all their associated data.
-- It is intended for cleaning up testing data before production deployment.
-- DO NOT use this for actual student end-of-year transitions.

CREATE OR REPLACE FUNCTION public.hard_delete_users(user_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  deleted_count INT := 0;
  id_numbers TEXT[];
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: only admins can hard-delete users';
  END IF;

  -- Collect id_numbers for cleaning enrollment data
  SELECT ARRAY_AGG(id_number) INTO id_numbers
  FROM public.users
  WHERE id = ANY(user_ids);

  -- 1. Delete from enrollment_archives by id_number
  IF id_numbers IS NOT NULL THEN
    DELETE FROM public.enrollment_archives
    WHERE id_number = ANY(id_numbers);

    -- 2. Delete from enrollment_requests by id_number
    DELETE FROM public.enrollment_requests
    WHERE id_number = ANY(id_numbers);
  END IF;

  -- 3. Delete from attendance (cadet_id or scanned_by references)
  DELETE FROM public.attendance WHERE cadet_id = ANY(user_ids);
  DELETE FROM public.attendance WHERE scanned_by = ANY(user_ids);

  -- 4. Delete from pull_out_requests if table exists
  BEGIN
    EXECUTE 'DELETE FROM public.pull_out_requests WHERE cadet_id = ANY($1)' USING user_ids;
  EXCEPTION WHEN undefined_table THEN
    NULL; -- table doesn't exist, skip
  END;

  -- 5. Delete from scan_audit_logs if table exists
  BEGIN
    EXECUTE 'DELETE FROM public.scan_audit_logs WHERE cadet_id = ANY($1) OR scanned_by = ANY($1)' USING user_ids;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 6. Delete from public.users (cascades to attendance via FK)
  DELETE FROM public.users WHERE id = ANY(user_ids);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- 7. Delete from auth.users (Supabase Auth)
  FOREACH uid IN ARRAY user_ids LOOP
    BEGIN
      DELETE FROM auth.users WHERE id = uid;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- user may not exist in auth.users (custom-auth legacy)
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', deleted_count,
    'message', deleted_count || ' user(s) permanently deleted'
  );
END;
$$;

-- Grant execute to authenticated users (RPC checks admin internally)
GRANT EXECUTE ON FUNCTION public.hard_delete_users(UUID[]) TO authenticated;

-- Allow admins to delete rejected enrollment requests directly
DROP POLICY IF EXISTS "enrollment_delete_admin" ON public.enrollment_requests;
CREATE POLICY "enrollment_delete_admin" ON public.enrollment_requests
  FOR DELETE TO authenticated USING (public.is_admin());

NOTIFY pgrst, 'reload schema';
