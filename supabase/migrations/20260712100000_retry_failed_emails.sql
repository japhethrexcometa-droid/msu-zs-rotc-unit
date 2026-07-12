-- ============================================================
-- Retry Failed Emails RPC
-- Resets all failed emails in the queue back to pending
-- so the cron processor will attempt to send them again.
-- Only admins and officers are authorized to call this.
-- ============================================================

CREATE OR REPLACE FUNCTION retry_failed_emails()
RETURNS integer AS $$
DECLARE
  updated_count integer;
  user_role text;
BEGIN
  -- 1. Get the actual role of the currently logged-in user
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();

  -- 2. Security: Only allow admins or officers to run this
  IF user_role NOT IN ('admin', 'officer') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 3. Reset failed emails back to pending
  UPDATE email_queue
  SET status = 'pending', attempts = 0, error_message = NULL
  WHERE status = 'failed';

  -- 4. Return count of reset emails
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
