
-- 1. Create pq_courses table
CREATE TABLE public.pq_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  level integer NOT NULL,
  semester text NOT NULL DEFAULT 'first',
  color text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pq_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pq_courses" ON public.pq_courses
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage pq_courses" ON public.pq_courses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Create past_questions table
CREATE TABLE public.past_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pq_course_id uuid NOT NULL REFERENCES public.pq_courses(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  uploaded_by_display text NOT NULL,
  file_path text NOT NULL,
  title text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  material_type text DEFAULT 'exam',
  level integer,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.past_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view past_questions" ON public.past_questions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage past_questions" ON public.past_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Add pq_course_id to community_uploads
ALTER TABLE public.community_uploads ADD COLUMN IF NOT EXISTS pq_course_id uuid REFERENCES public.pq_courses(id);

-- 4. Create view pq_courses_with_counts
CREATE OR REPLACE VIEW public.pq_courses_with_counts AS
SELECT
  c.*,
  COALESCE(pq.cnt, 0) AS question_count
FROM public.pq_courses c
LEFT JOIN (
  SELECT pq_course_id, COUNT(*) AS cnt FROM public.past_questions GROUP BY pq_course_id
) pq ON pq.pq_course_id = c.id;

-- 5. Create approve_pq_upload function
CREATE OR REPLACE FUNCTION public.approve_pq_upload(p_upload_id uuid, p_reviewer_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_upload RECORD;
  v_uploader_name text;
BEGIN
  IF NOT (has_role(p_reviewer_id, 'admin') OR has_role(p_reviewer_id, 'rep')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_upload FROM community_uploads WHERE id = p_upload_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload not found or already reviewed';
  END IF;

  SELECT COALESCE(display_name, nickname, 'Anonymous') INTO v_uploader_name
  FROM profiles WHERE id = v_upload.user_id;

  UPDATE community_uploads
  SET status = 'approved', reviewed_by = p_reviewer_id, review_note = p_note, reviewed_at = now()
  WHERE id = p_upload_id;

  INSERT INTO past_questions (pq_course_id, uploaded_by, uploaded_by_display, file_path, title, file_size, material_type, level)
  VALUES (v_upload.pq_course_id, v_upload.user_id, v_uploader_name, v_upload.file_path, v_upload.title, v_upload.file_size, COALESCE(v_upload.material_type, 'exam'), v_upload.level);

  INSERT INTO contributor_points (user_id, total_points, approved_count, pending_count)
  VALUES (v_upload.user_id, 10, 1, -1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = contributor_points.total_points + 10,
    approved_count = contributor_points.approved_count + 1,
    pending_count = GREATEST(0, contributor_points.pending_count - 1),
    updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM contributor_badges WHERE user_id = v_upload.user_id AND badge_type = 'first_upload') THEN
    INSERT INTO contributor_badges (user_id, badge_type) VALUES (v_upload.user_id, 'first_upload');
  END IF;

  INSERT INTO user_notifications (user_id, notification_type, title, message, metadata)
  VALUES (v_upload.user_id, 'upload_approved', 'Past Question Approved! 🎉', 'Your past question "' || v_upload.title || '" is now live.', jsonb_build_object('title', v_upload.title, 'note', COALESCE(p_note, '')));
END;
$$;
