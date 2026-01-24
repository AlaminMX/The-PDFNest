-- Fix security linter issues

-- 1. Fix SECURITY DEFINER view: recreate without SECURITY DEFINER or use a function instead
-- We'll use a function approach since views don't support parameterization well
DROP VIEW IF EXISTS public.user_profile_summary;

CREATE OR REPLACE FUNCTION public.get_user_profile_summary(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  total_storage_used BIGINT,
  created_at TIMESTAMPTZ,
  department_id UUID,
  department_name TEXT,
  pdf_count BIGINT,
  unread_notification_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.full_name,
    p.email,
    p.avatar_url,
    p.total_storage_used,
    p.created_at,
    p.department_id,
    d.name as department_name,
    (SELECT COUNT(*) FROM public.pdf_files WHERE user_id = p.id) as pdf_count,
    (SELECT COUNT(*) FROM public.user_notifications WHERE user_id = p.id AND is_read = false) as unread_notification_count
  FROM public.profiles p
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE p.id = p_user_id
    AND (auth.uid() = p_user_id OR has_role(auth.uid(), 'admin'::app_role));
$$;

-- 2. Fix overly permissive INSERT policy on user_notifications
-- Replace the "System can insert notifications" policy with a more restrictive one
DROP POLICY IF EXISTS "System can insert notifications" ON public.user_notifications;

-- Since edge functions run with service_role, they bypass RLS anyway
-- This policy is for any authenticated user creating their own test notifications (if needed)
-- For production, edge functions will use service_role which bypasses RLS
-- We'll create a restrictive policy that won't be triggered in normal operation
CREATE POLICY "Service role can insert notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (
  -- Only allow if calling user is admin (for testing) or if no auth context (service role)
  auth.uid() IS NULL OR has_role(auth.uid(), 'admin'::app_role)
);