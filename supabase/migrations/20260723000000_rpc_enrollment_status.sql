-- Create an RPC to safely check enrollment status bypassing RLS
CREATE OR REPLACE FUNCTION public.check_enrollment_open()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  val JSONB;
BEGIN
  SELECT value INTO val
  FROM public.system_settings
  WHERE id = 'enrollment_open';
  
  IF val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Handle both boolean true and string "true" in JSONB
  IF val = 'true'::jsonb OR val = '"true"'::jsonb THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_enrollment_open TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
