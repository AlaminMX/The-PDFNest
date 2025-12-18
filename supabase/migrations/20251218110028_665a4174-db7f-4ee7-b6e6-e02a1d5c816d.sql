-- Drop the existing view
DROP VIEW IF EXISTS public.public_rep_profiles CASCADE;

-- Recreate as a VIEW with security_invoker (inherits RLS from underlying tables)
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

-- Grant read access to all users
GRANT SELECT ON public.public_rep_profiles TO authenticated, anon;