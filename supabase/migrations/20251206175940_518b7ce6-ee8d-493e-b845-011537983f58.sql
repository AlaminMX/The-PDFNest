-- Create a secure view for public rep profiles that excludes sensitive data
CREATE OR REPLACE VIEW public.public_rep_profiles AS
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

-- Add RLS policy for viewing rep profiles publicly via the profiles table
-- This ensures when accessing profiles directly, users can only see their own or admins can see all
-- The public_rep_profiles view handles public rep access without exposing email

-- First, let's also add a policy that allows viewing basic rep profile info for attribution
-- But only the non-sensitive columns through specific functions

-- Create a security definer function to get rep display info safely
CREATE OR REPLACE FUNCTION public.get_rep_public_info(rep_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  department_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.department_id
  FROM public.profiles p
  WHERE p.id = rep_user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'rep'
  );
$$;