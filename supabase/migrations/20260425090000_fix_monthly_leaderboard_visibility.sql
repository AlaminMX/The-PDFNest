-- Fix leaderboard visibility for non-admin users by exposing a safe monthly leaderboard view.
-- This view intentionally exposes only leaderboard-safe fields and computes counts
-- from approved uploads in the current UTC month.

CREATE OR REPLACE VIEW public.monthly_contributor_leaderboard AS
WITH monthly_approved_uploads AS (
  SELECT
    cu.user_id,
    cu.department_id,
    COUNT(*)::integer AS monthly_uploads
  FROM public.community_uploads cu
  WHERE cu.status = 'approved'
    AND cu.reviewed_at >= date_trunc('month', now() AT TIME ZONE 'utc')
  GROUP BY cu.user_id, cu.department_id
),
user_badges AS (
  SELECT
    cb.user_id,
    jsonb_agg(
      jsonb_build_object(
        'badge_type', cb.badge_type,
        'earned_at', cb.earned_at
      )
      ORDER BY cb.earned_at ASC
    ) AS badges
  FROM public.contributor_badges cb
  GROUP BY cb.user_id
)
SELECT
  mau.user_id,
  COALESCE(NULLIF(TRIM(p.display_name), ''), 'Anonymous') AS display_name,
  p.avatar_url,
  mau.department_id,
  d.name AS department_name,
  mau.monthly_uploads,
  COALESCE(ub.badges, '[]'::jsonb) AS badges
FROM monthly_approved_uploads mau
LEFT JOIN public.profiles p ON p.id = mau.user_id
LEFT JOIN public.departments d ON d.id = mau.department_id
LEFT JOIN user_badges ub ON ub.user_id = mau.user_id
WHERE mau.monthly_uploads > 0;

-- Keep this view as definer security so it can safely project leaderboard fields
-- regardless of underlying row-level policies on source tables.
ALTER VIEW public.monthly_contributor_leaderboard SET (security_invoker = false);

GRANT SELECT ON public.monthly_contributor_leaderboard TO authenticated;
