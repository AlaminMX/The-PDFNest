-- Helper function to safely increment pending_count when a user submits a material.
-- Uses INSERT ... ON CONFLICT to handle both first-time and repeat contributors.
CREATE OR REPLACE FUNCTION public.increment_pending_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO contributor_points (user_id, pending_count)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET pending_count = contributor_points.pending_count + 1,
        updated_at    = now();
END;
$$;
