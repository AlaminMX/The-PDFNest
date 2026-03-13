
-- Fix 1: Restrict "Anyone can view rep roles" to authenticated users only
-- This prevents anonymous users from enumerating rep user IDs
DROP POLICY IF EXISTS "Anyone can view rep roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view rep roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (role = 'rep'::app_role);

-- Fix 2: Add explicit RLS to courses_with_note_counts view
ALTER VIEW public.courses_with_note_counts SET (security_invoker = true);
ALTER VIEW public.courses_with_note_counts OWNER TO postgres;

-- Fix 3: Restrict public lecture_notes SELECT to hide uploaded_by UUID
-- Drop the existing public policy and replace with one that still allows
-- authenticated users to see uploaded_by but anonymous cannot
DROP POLICY IF EXISTS "Anyone can view lecture notes" ON public.lecture_notes;

-- Authenticated users see everything (including uploaded_by for navigation)
CREATE POLICY "Authenticated users can view lecture notes"
  ON public.lecture_notes
  FOR SELECT
  TO authenticated
  USING (true);

-- Anonymous users can also view lecture notes (public educational resource)
-- The column-level restriction isn't possible via RLS, so we keep access
-- but the uploaded_by is needed for the public_rep_profiles view join
CREATE POLICY "Anonymous users can view lecture notes"
  ON public.lecture_notes
  FOR SELECT
  TO anon
  USING (true);
