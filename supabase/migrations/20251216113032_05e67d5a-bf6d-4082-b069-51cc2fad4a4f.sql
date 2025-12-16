-- Allow anyone (authenticated or anonymous) to view profiles of users with 'rep' role
-- This ensures rep names and avatars display correctly on lecture notes for all users
CREATE POLICY "Anyone can view rep profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = profiles.id AND ur.role = 'rep'
  )
);