-- Fix admin approval renames and rep multi-department forwarding.

DROP FUNCTION IF EXISTS public.approve_community_upload(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.approve_pq_upload(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.create_rep_lecture_note(
  p_course_id uuid,
  p_file_path text,
  p_title text,
  p_file_size integer,
  p_uploaded_by_display text,
  p_material_type text DEFAULT 'lecture_note',
  p_level integer DEFAULT 100
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF btrim(COALESCE(p_title, '')) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF NOT has_role(auth.uid(), 'rep'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: must be a course representative';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM profiles rep
    JOIN departments rep_dept ON rep_dept.id = rep.department_id
    JOIN courses target_course ON target_course.id = p_course_id
    JOIN departments target_dept ON target_dept.id = target_course.department_id
    WHERE rep.id = auth.uid()
      AND (
        rep.department_id = target_course.department_id
        OR (
          rep_dept.faculty_id IS NOT NULL
          AND rep_dept.faculty_id = target_dept.faculty_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'Rep can only upload to courses in their department or faculty';
  END IF;

  SELECT id INTO v_note_id
  FROM lecture_notes
  WHERE course_id = p_course_id
    AND file_path = p_file_path
  LIMIT 1;

  IF v_note_id IS NOT NULL THEN
    RETURN v_note_id;
  END IF;

  INSERT INTO lecture_notes (
    course_id,
    uploaded_by,
    file_path,
    title,
    file_size,
    uploaded_by_display,
    material_type,
    level
  )
  VALUES (
    p_course_id,
    auth.uid(),
    p_file_path,
    btrim(p_title),
    p_file_size,
    COALESCE(NULLIF(btrim(p_uploaded_by_display), ''), 'Anonymous'),
    COALESCE(NULLIF(p_material_type, ''), 'lecture_note'),
    COALESCE(p_level, 100)
  )
  RETURNING id INTO v_note_id;

  RETURN v_note_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_community_upload(
  p_upload_id uuid,
  p_reviewer_id uuid,
  p_note text DEFAULT NULL,
  p_title text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upload RECORD;
  v_uploader_name text;
  v_course_level integer;
  v_final_title text;
BEGIN
  IF NOT (has_role(p_reviewer_id, 'admin') OR has_role(p_reviewer_id, 'rep')) THEN
    RAISE EXCEPTION 'Unauthorized: must be admin or rep';
  END IF;

  v_final_title := btrim(COALESCE(p_title, ''));
  IF v_final_title = '' THEN
    SELECT title INTO v_final_title FROM community_uploads WHERE id = p_upload_id;
    v_final_title := btrim(COALESCE(v_final_title, ''));
  END IF;
  IF v_final_title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  UPDATE community_uploads
  SET
    title = v_final_title,
    status = 'approved',
    reviewed_by = p_reviewer_id,
    review_note = p_note,
    reviewed_at = now()
  WHERE id = p_upload_id
    AND status = 'pending'
  RETURNING * INTO v_upload;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload not found or already reviewed';
  END IF;

  IF has_role(p_reviewer_id, 'rep') AND NOT has_role(p_reviewer_id, 'admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = p_reviewer_id AND department_id = v_upload.department_id
    ) THEN
      RAISE EXCEPTION 'Rep can only approve uploads in their department';
    END IF;
  END IF;

  SELECT COALESCE(display_name, nickname, 'Anonymous') INTO v_uploader_name FROM profiles WHERE id = v_upload.user_id;

  SELECT level INTO v_course_level FROM courses WHERE id = v_upload.course_id;
  IF v_course_level IS NULL THEN
    v_course_level := COALESCE(v_upload.level, 100);
  END IF;

  INSERT INTO lecture_notes (
    course_id, uploaded_by, file_path, title, file_size,
    uploaded_by_display, material_type, level
  )
  SELECT
    v_upload.course_id, v_upload.user_id, v_upload.file_path,
    v_final_title, v_upload.file_size, v_uploader_name,
    COALESCE(v_upload.material_type, 'lecture_note'),
    v_course_level
  WHERE NOT EXISTS (
    SELECT 1 FROM lecture_notes ln
    WHERE ln.course_id = v_upload.course_id
      AND ln.file_path = v_upload.file_path
  );

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
  IF (SELECT approved_count FROM contributor_points WHERE user_id = v_upload.user_id) >= 5 THEN
    INSERT INTO contributor_badges (user_id, badge_type) VALUES (v_upload.user_id, 'course_helper')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  IF (SELECT COUNT(*) FROM community_uploads WHERE user_id = v_upload.user_id AND department_id = v_upload.department_id AND status = 'approved') >= 10 THEN
    INSERT INTO contributor_badges (user_id, badge_type) VALUES (v_upload.user_id, 'department_contributor')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  IF (SELECT approved_count FROM contributor_points WHERE user_id = v_upload.user_id) >= 25 THEN
    INSERT INTO contributor_badges (user_id, badge_type) VALUES (v_upload.user_id, 'top_contributor')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  INSERT INTO user_notifications (user_id, notification_type, department_id, title, message, metadata)
  VALUES (v_upload.user_id, 'upload_approved', v_upload.department_id, 'Upload Approved! 🎉',
          'Your material "' || v_final_title || '" is now live.',
          jsonb_build_object('title', v_final_title, 'note', COALESCE(p_note, '')));
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_pq_upload(
  p_upload_id uuid,
  p_reviewer_id uuid,
  p_note text DEFAULT NULL,
  p_title text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_upload RECORD;
  v_uploader_name text;
  v_final_title text;
BEGIN
  IF NOT (has_role(p_reviewer_id, 'admin') OR has_role(p_reviewer_id, 'rep')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_final_title := btrim(COALESCE(p_title, ''));
  IF v_final_title = '' THEN
    SELECT title INTO v_final_title FROM community_uploads WHERE id = p_upload_id;
    v_final_title := btrim(COALESCE(v_final_title, ''));
  END IF;
  IF v_final_title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  UPDATE community_uploads
  SET title = v_final_title,
      status = 'approved',
      reviewed_by = p_reviewer_id,
      review_note = p_note,
      reviewed_at = now()
  WHERE id = p_upload_id
    AND status = 'pending'
  RETURNING * INTO v_upload;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload not found or already reviewed';
  END IF;

  SELECT COALESCE(display_name, nickname, 'Anonymous') INTO v_uploader_name
  FROM profiles WHERE id = v_upload.user_id;

  INSERT INTO past_questions (pq_course_id, uploaded_by, uploaded_by_display, file_path, title, file_size, material_type, level)
  SELECT v_upload.pq_course_id, v_upload.user_id, v_uploader_name, v_upload.file_path, v_final_title, v_upload.file_size, COALESCE(v_upload.material_type, 'exam'), v_upload.level
  WHERE NOT EXISTS (
    SELECT 1 FROM past_questions pq
    WHERE pq.pq_course_id = v_upload.pq_course_id
      AND pq.file_path = v_upload.file_path
  );

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
  VALUES (v_upload.user_id, 'upload_approved', 'Past Question Approved! 🎉', 'Your past question "' || v_final_title || '" is now live.', jsonb_build_object('title', v_final_title, 'note', COALESCE(p_note, '')));
END;
$$;

DROP POLICY IF EXISTS "Reps can create courses in their faculty" ON public.courses;
CREATE POLICY "Reps can create courses in their faculty"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'rep'::app_role)
  AND EXISTS (
    SELECT 1
    FROM profiles rep
    JOIN departments rep_dept ON rep_dept.id = rep.department_id
    JOIN departments target_dept ON target_dept.id = courses.department_id
    WHERE rep.id = auth.uid()
      AND rep_dept.faculty_id IS NOT NULL
      AND rep_dept.faculty_id = target_dept.faculty_id
  )
);

-- Ensure PostgREST can execute the updated overloads and refreshes its schema cache.
GRANT EXECUTE ON FUNCTION public.approve_community_upload(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pq_upload(uuid, uuid, text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
