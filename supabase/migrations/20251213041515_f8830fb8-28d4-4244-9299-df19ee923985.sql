-- Drop the problematic policy that exposes email addresses
DROP POLICY IF EXISTS "Anyone can view rep profiles basic info" ON public.profiles;

-- Note: Public rep profile access should go through the public_rep_profiles view
-- which already excludes the email column. The view is defined as:
-- SELECT id, display_name, avatar_url, department_id, is_insider, created_at
-- FROM profiles WHERE user is a rep (no email exposed)