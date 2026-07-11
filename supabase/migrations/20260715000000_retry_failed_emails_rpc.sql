-- =============================================================================
-- Migration: Add retry_failed_emails RPC for Admin Email Queue Management
-- =============================================================================

CREATE OR REPLACE FUNCTION public.retry_failed_emails()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 1. Security Check: Only administrators are authorized to reset failed emails
  IF NOT public.is_admin() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Administrator privileges required.'
    );
  END IF;

  -- 2. Reset failed emails in public.email_queue
  UPDATE public.email_queue
  SET status = 'pending',
      attempts = 0,
      error_message = NULL,
      processed_at = NULL
  WHERE status = 'failed';

  -- 3. Retrieve number of affected rows
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'retried_count', v_count,
    'message', COALESCE(v_count, 0) || ' failed email(s) successfully queued for retry.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users (who will then be filtered by public.is_admin() check inside the function)
GRANT EXECUTE ON FUNCTION public.retry_failed_emails() TO authenticated;
