
-- Create a function to purge old session data (older than 90 days)
-- and strip detailed activity data from sessions older than 30 days
CREATE OR REPLACE FUNCTION public.purge_old_session_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete sessions older than 90 days
  DELETE FROM public.user_sessions
  WHERE login_at < now() - interval '90 days';

  -- Strip detailed activity data from sessions older than 30 days
  UPDATE public.user_sessions
  SET 
    activities = '[]'::jsonb,
    activity_summary = '{}'::jsonb,
    user_agent = NULL
  WHERE login_at < now() - interval '30 days'
    AND (activities != '[]'::jsonb OR user_agent IS NOT NULL);

  -- Delete activity logs older than 90 days
  DELETE FROM public.user_activity_logs
  WHERE created_at < now() - interval '90 days';

  -- Strip user_agent and ip_address from activity logs older than 30 days
  UPDATE public.user_activity_logs
  SET 
    user_agent = NULL,
    ip_address = NULL
  WHERE created_at < now() - interval '30 days'
    AND (user_agent IS NOT NULL OR ip_address IS NOT NULL);
END;
$$;

-- Restrict execution to authenticated users (admins will call it)
REVOKE EXECUTE ON FUNCTION public.purge_old_session_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_session_data() TO authenticated;
