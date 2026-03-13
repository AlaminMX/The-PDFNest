
-- ============================================
-- PHASE 1: Community Uploads + Contributor System
-- ============================================

-- 1. community_uploads table
CREATE TABLE public.community_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  faculty_id uuid REFERENCES public.faculties(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  level integer NOT NULL DEFAULT 100,
  semester text NOT NULL DEFAULT 'first',
  title text NOT NULL,
  description text,
  material_type text NOT NULL DEFAULT 'lecture_note',
  file_path text NOT NULL,
  original_file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_hash text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_uploads ENABLE ROW LEVEL SECURITY;

-- Users can insert their own uploads
CREATE POLICY "Users can insert own uploads"
  ON public.community_uploads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view own uploads
CREATE POLICY "Users can view own uploads"
  ON public.community_uploads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all uploads
CREATE POLICY "Admins can view all uploads"
  ON public.community_uploads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all uploads (approve/reject)
CREATE POLICY "Admins can update all uploads"
  ON public.community_uploads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete uploads
CREATE POLICY "Admins can delete all uploads"
  ON public.community_uploads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Reps can view uploads in their department
CREATE POLICY "Reps can view department uploads"
  ON public.community_uploads FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'rep') AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.department_id = community_uploads.department_id
    )
  );

-- Reps can update (approve/reject) uploads in their department
CREATE POLICY "Reps can update department uploads"
  ON public.community_uploads FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'rep') AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.department_id = community_uploads.department_id
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'rep') AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.department_id = community_uploads.department_id
    )
  );

-- 2. contributor_points table
CREATE TABLE public.contributor_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  approved_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contributor_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contributor points"
  ON public.contributor_points FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contributor points"
  ON public.contributor_points FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow anyone authenticated to view for leaderboard
CREATE POLICY "Authenticated can view all for leaderboard"
  ON public.contributor_points FOR SELECT TO authenticated
  USING (true);

-- 3. contributor_badges table
CREATE TABLE public.contributor_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE public.contributor_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view badges"
  ON public.contributor_badges FOR SELECT TO authenticated
  USING (true);

-- 4. Leaderboard view
CREATE OR REPLACE VIEW public.contributor_leaderboard AS
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

-- 5. approve_community_upload function
CREATE OR REPLACE FUNCTION public.approve_community_upload(
  p_upload_id uuid,
  p_reviewer_id uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upload RECORD;
  v_uploader_name text;
BEGIN
  -- Verify reviewer is admin or rep
  IF NOT (has_role(p_reviewer_id, 'admin') OR has_role(p_reviewer_id, 'rep')) THEN
    RAISE EXCEPTION 'Unauthorized: must be admin or rep';
  END IF;

  -- Get upload details
  SELECT * INTO v_upload FROM community_uploads WHERE id = p_upload_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload not found or already reviewed';
  END IF;

  -- If rep, verify same department
  IF has_role(p_reviewer_id, 'rep') AND NOT has_role(p_reviewer_id, 'admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = p_reviewer_id AND department_id = v_upload.department_id
    ) THEN
      RAISE EXCEPTION 'Rep can only approve uploads in their department';
    END IF;
  END IF;

  -- Get uploader display name
  SELECT COALESCE(display_name, 'Anonymous') INTO v_uploader_name FROM profiles WHERE id = v_upload.user_id;

  -- Update upload status
  UPDATE community_uploads
  SET status = 'approved', reviewed_by = p_reviewer_id, review_note = p_note, reviewed_at = now()
  WHERE id = p_upload_id;

  -- Create lecture_notes entry
  INSERT INTO lecture_notes (course_id, uploaded_by, file_path, title, file_size, uploaded_by_display)
  VALUES (v_upload.course_id, v_upload.user_id, v_upload.file_path, v_upload.title, v_upload.file_size, v_uploader_name);

  -- Upsert contributor points
  INSERT INTO contributor_points (user_id, total_points, approved_count, pending_count)
  VALUES (v_upload.user_id, 10, 1, -1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = contributor_points.total_points + 10,
    approved_count = contributor_points.approved_count + 1,
    pending_count = GREATEST(0, contributor_points.pending_count - 1),
    updated_at = now();

  -- Check badge eligibility
  -- First Upload badge
  IF NOT EXISTS (SELECT 1 FROM contributor_badges WHERE user_id = v_upload.user_id AND badge_type = 'first_upload') THEN
    INSERT INTO contributor_badges (user_id, badge_type) VALUES (v_upload.user_id, 'first_upload');
  END IF;

  -- Course Helper badge (5+ approved)
  IF (SELECT approved_count FROM contributor_points WHERE user_id = v_upload.user_id) >= 5 THEN
    INSERT INTO contributor_badges (user_id, badge_type) VALUES (v_upload.user_id, 'course_helper')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Department Contributor badge (10+ in one department)
  IF (SELECT COUNT(*) FROM community_uploads WHERE user_id = v_upload.user_id AND department_id = v_upload.department_id AND status = 'approved') >= 10 THEN
    INSERT INTO contributor_badges (user_id, badge_type) VALUES (v_upload.user_id, 'department_contributor')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Top Contributor badge (25+ approved)
  IF (SELECT approved_count FROM contributor_points WHERE user_id = v_upload.user_id) >= 25 THEN
    INSERT INTO contributor_badges (user_id, badge_type) VALUES (v_upload.user_id, 'top_contributor')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Notify uploader
  INSERT INTO user_notifications (user_id, notification_type, department_id, metadata)
  VALUES (v_upload.user_id, 'upload_approved', v_upload.department_id,
    jsonb_build_object('title', v_upload.title, 'note', COALESCE(p_note, ''))
  );
END;
$$;

-- 6. reject_community_upload function
CREATE OR REPLACE FUNCTION public.reject_community_upload(
  p_upload_id uuid,
  p_reviewer_id uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upload RECORD;
BEGIN
  IF NOT (has_role(p_reviewer_id, 'admin') OR has_role(p_reviewer_id, 'rep')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_upload FROM community_uploads WHERE id = p_upload_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload not found or already reviewed';
  END IF;

  IF has_role(p_reviewer_id, 'rep') AND NOT has_role(p_reviewer_id, 'admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = p_reviewer_id AND department_id = v_upload.department_id
    ) THEN
      RAISE EXCEPTION 'Rep can only reject uploads in their department';
    END IF;
  END IF;

  UPDATE community_uploads
  SET status = 'rejected', reviewed_by = p_reviewer_id, review_note = p_note, reviewed_at = now()
  WHERE id = p_upload_id;

  -- Update contributor points
  INSERT INTO contributor_points (user_id, rejected_count, pending_count)
  VALUES (v_upload.user_id, 1, -1)
  ON CONFLICT (user_id) DO UPDATE SET
    rejected_count = contributor_points.rejected_count + 1,
    pending_count = GREATEST(0, contributor_points.pending_count - 1),
    updated_at = now();

  -- Notify uploader
  INSERT INTO user_notifications (user_id, notification_type, department_id, metadata)
  VALUES (v_upload.user_id, 'upload_rejected', v_upload.department_id,
    jsonb_build_object('title', v_upload.title, 'reason', COALESCE(p_note, 'No reason provided'))
  );
END;
$$;

-- 7. check_duplicate_upload function
CREATE OR REPLACE FUNCTION public.check_duplicate_upload(
  p_file_hash text,
  p_file_name text,
  p_file_size bigint,
  p_course_id uuid
)
RETURNS TABLE(id uuid, title text, original_file_name text, status text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cu.id, cu.title, cu.original_file_name, cu.status, cu.created_at
  FROM community_uploads cu
  WHERE cu.course_id = p_course_id
    AND (
      (p_file_hash IS NOT NULL AND cu.file_hash = p_file_hash)
      OR (cu.original_file_name = p_file_name AND cu.file_size = p_file_size)
    )
  LIMIT 5;
$$;

-- 8. Update admin_delete_user_account to clean up new tables
CREATE OR REPLACE FUNCTION public.admin_delete_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  DELETE FROM public.contributor_badges WHERE user_id = p_user_id;
  DELETE FROM public.contributor_points WHERE user_id = p_user_id;
  DELETE FROM public.community_uploads WHERE user_id = p_user_id;
  DELETE FROM public.pdf_conversations WHERE user_id = p_user_id;
  DELETE FROM public.pdf_summaries WHERE user_id = p_user_id;
  DELETE FROM public.study_guides WHERE user_id = p_user_id;
  DELETE FROM public.user_activity_logs WHERE user_id = p_user_id;
  DELETE FROM public.user_sessions WHERE user_id = p_user_id;
  DELETE FROM public.user_notifications WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.categories WHERE user_id = p_user_id;
  DELETE FROM public.pdf_files WHERE user_id = p_user_id;
  DELETE FROM public.lecture_notes WHERE uploaded_by = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
