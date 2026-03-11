
-- Fix 1: Make the leaderboard view use security invoker instead of definer
DROP VIEW IF EXISTS public.contributor_leaderboard;
CREATE VIEW public.contributor_leaderboard
WITH (security_invoker = true)
AS
SELECT
  cp.user_id,
  cp.total_points,
  cp.approved_count,
  p.display_name,
  p.avatar_url,
  p.department_id,
  d.name as department_name,
  RANK() OVER (ORDER BY cp.total_points DESC) as overall_rank
FROM public.contributor_points cp
JOIN public.profiles p ON p.id = cp.user_id
LEFT JOIN public.departments d ON d.id = p.department_id
WHERE cp.total_points > 0;

-- Fix 2: The "Authenticated can view all for leaderboard" policy is redundant 
-- since users already have own-view + admin-view policies, and the view uses security_invoker.
-- Drop it and replace with a narrower policy that only allows viewing points > 0 (for leaderboard display).
DROP POLICY IF EXISTS "Authenticated can view all for leaderboard" ON public.contributor_points;
CREATE POLICY "Authenticated can view points for leaderboard"
  ON public.contributor_points FOR SELECT TO authenticated
  USING (total_points > 0);
