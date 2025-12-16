-- Allow public reading of 'rep' role for the public_rep_profiles view to work correctly
-- This is safe because we're only exposing the fact that someone is a rep (public info)
CREATE POLICY "Anyone can view rep roles"
ON public.user_roles
FOR SELECT
TO authenticated, anon
USING (role = 'rep');