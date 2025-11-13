-- Add restrictive RLS policies to user_roles table to prevent privilege escalation
-- These policies ensure that users cannot modify their own roles or grant themselves admin access

CREATE POLICY "No user INSERT on roles"
ON public.user_roles FOR INSERT
WITH CHECK (false);

CREATE POLICY "No user UPDATE on roles"
ON public.user_roles FOR UPDATE
USING (false);

CREATE POLICY "No user DELETE on roles"
ON public.user_roles FOR DELETE
USING (false);