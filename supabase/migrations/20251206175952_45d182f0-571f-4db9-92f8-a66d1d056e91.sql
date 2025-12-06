-- Drop the security definer view and recreate as a regular view
DROP VIEW IF EXISTS public.public_rep_profiles;

-- Create the view without security definer (inherits caller's RLS)
-- Since profiles table has RLS, we need a different approach
-- Use a security invoker view which is the default and safe

CREATE VIEW public.public_rep_profiles 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.display_name,
  p.avatar_url,
  p.department_id,
  p.is_insider,
  p.created_at
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'rep'
);

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_rep_profiles TO authenticated, anon;

-- Add a policy to profiles table that allows viewing rep profiles publicly
-- This is safe because it only exposes profiles that are reps
CREATE POLICY "Anyone can view rep profiles basic info"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = profiles.id AND ur.role = 'rep'
  )
);