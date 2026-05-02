
-- Fix: Recreate contributor_leaderboard WITHOUT security_invoker
-- so non-admin users can see all leaderboard entries (profiles RLS was blocking them)
DROP VIEW IF EXISTS public.contributor_leaderboard;

CREATE VIEW public.contributor_leaderboard AS
SELECT 
  cp.user_id,
  cp.total_points,
  cp.approved_count,
  p.display_name,
  p.avatar_url,
  p.department_id,
  d.name AS department_name,
  rank() OVER (ORDER BY cp.total_points DESC) AS overall_rank
FROM contributor_points cp
JOIN profiles p ON p.id = cp.user_id
LEFT JOIN departments d ON d.id = p.department_id
WHERE cp.total_points > 0;

-- Grant access
GRANT SELECT ON public.contributor_leaderboard TO authenticated;

-- Create the missing monthly_contributor_leaderboard view
-- Counts approved community_uploads in the current calendar month
CREATE OR REPLACE VIEW public.monthly_contributor_leaderboard AS
SELECT
  p.id AS user_id,
  p.display_name,
  p.avatar_url,
  p.department_id,
  d.name AS department_name,
  COUNT(cu.id)::int AS monthly_uploads,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('badge_type', cb.badge_type, 'earned_at', cb.earned_at))
     FROM contributor_badges cb WHERE cb.user_id = p.id),
    '[]'::jsonb
  ) AS badges
FROM community_uploads cu
JOIN profiles p ON p.id = cu.user_id
LEFT JOIN departments d ON d.id = p.department_id
WHERE cu.status = 'approved'
  AND cu.reviewed_at >= date_trunc('month', now())
  AND cu.reviewed_at < date_trunc('month', now()) + interval '1 month'
GROUP BY p.id, p.display_name, p.avatar_url, p.department_id, d.name
HAVING COUNT(cu.id) > 0;

-- Grant access
GRANT SELECT ON public.monthly_contributor_leaderboard TO authenticated;
