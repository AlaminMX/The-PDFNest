-- Keep writes behind the Edge Function that verifies the session and timestamps events.
revoke execute on function public.insert_activity_event(text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.insert_activity_event(timestamptz, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.record_failed_login_attempt(text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.record_failed_login_attempt(text, inet, text, text, jsonb)
  from public, anon, authenticated;


CREATE OR REPLACE FUNCTION public.purge_old_session_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

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

revoke execute on function public.purge_old_session_data() from public, anon;
grant execute on function public.purge_old_session_data() to authenticated;
