
-- Create the insert_activity_event function that the activity-log edge function calls
CREATE OR REPLACE FUNCTION public.insert_activity_event(
  p_timestamp text,
  p_user_id text,
  p_session_id text,
  p_action text,
  p_resource text,
  p_status text,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip guest/anonymous activity to avoid polluting logs
  IF p_user_id = 'guest' THEN
    RETURN;
  END IF;

  INSERT INTO public.user_activity_logs (
    user_id,
    activity_type,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_user_id::uuid,
    p_action,
    jsonb_build_object(
      'session_id', p_session_id,
      'resource', p_resource,
      'status', p_status,
      'context', p_context,
      'timestamp', p_timestamp
    ),
    (p_context->>'ip_address')::text,
    (p_context->>'user_agent')::text,
    COALESCE(p_timestamp::timestamptz, now())
  );
END;
$$;

-- Restrict to authenticated and service role
REVOKE EXECUTE ON FUNCTION public.insert_activity_event(text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_activity_event(text, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_activity_event(text, text, text, text, text, text, jsonb) TO service_role;

-- Create record_failed_login_attempt function (also called by activity-log)
CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(
  p_identifier text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Log the failed attempt as an activity
  INSERT INTO public.user_activity_logs (
    user_id,
    activity_type,
    details,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'LOGIN_FAILED',
    jsonb_build_object(
      'identifier', p_identifier,
      'session_id', p_session_id,
      'context', p_context
    ),
    p_ip_address,
    p_user_agent
  );

  -- Count failed attempts in the last 15 minutes for this identifier
  SELECT COUNT(*) INTO recent_count
  FROM public.user_activity_logs
  WHERE activity_type = 'LOGIN_FAILED'
    AND details->>'identifier' = p_identifier
    AND created_at > now() - interval '15 minutes';

  RETURN recent_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_failed_login_attempt(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_failed_login_attempt(text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login_attempt(text, text, text, text, jsonb) TO service_role;
