-- ================================================================
-- HIERARCHY REFACTOR: Add material_type + level to lecture_notes
-- ================================================================
-- The existing hierarchy is already:
--   faculties → departments → courses (has level + semester) → lecture_notes
--
-- Gaps being closed:
--   1. lecture_notes gains material_type (was only on community_uploads)
--   2. lecture_notes gains a denormalised level column for fast filtering
--      (level is already on the course, this avoids a join on every browse)
--   3. Existing rows get safe defaults (no data loss)
--   4. approve_community_upload function updated to propagate material_type
-- ================================================================

-- 1. Add material_type to lecture_notes
ALTER TABLE public.lecture_notes
  ADD COLUMN IF NOT EXISTS material_type text NOT NULL DEFAULT 'lecture_note';

-- Constrain to known types
ALTER TABLE public.lecture_notes
  ADD CONSTRAINT lecture_notes_material_type_valid
  CHECK (material_type IN (
    'lecture_note', 'past_question', 'handout',
    'assignment', 'tutorial', 'other'
  ));

-- 2. Add denormalised level column (copied from the linked course row)
ALTER TABLE public.lecture_notes
  ADD COLUMN IF NOT EXISTS level integer;

-- 3. Back-fill level from the courses table for all existing rows
UPDATE public.lecture_notes ln
SET level = c.level
FROM public.courses c
WHERE c.id = ln.course_id
  AND ln.level IS NULL;

-- Default any orphaned rows (no matching course) to 100
UPDATE public.lecture_notes
SET level = 100
WHERE level IS NULL;

-- Now make it NOT NULL with a safe default
ALTER TABLE public.lecture_notes
  ALTER COLUMN level SET NOT NULL,
  ALTER COLUMN level SET DEFAULT 100;

-- 4. Index for fast level + material_type filtering
CREATE INDEX IF NOT EXISTS idx_lecture_notes_course_type
  ON public.lecture_notes (course_id, material_type);

CREATE INDEX IF NOT EXISTS idx_lecture_notes_course_level
  ON public.lecture_notes (course_id, level);

-- 5. Update approve_community_upload to copy material_type + level into lecture_notes
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
  v_course_level integer;
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

  -- Get level from the course if not on the upload
  SELECT level INTO v_course_level FROM courses WHERE id = v_upload.course_id;
  IF v_course_level IS NULL THEN
    v_course_level := COALESCE(v_upload.level, 100);
  END IF;

  -- Update upload status
  UPDATE community_uploads
  SET status = 'approved', reviewed_by = p_reviewer_id, review_note = p_note, reviewed_at = now()
  WHERE id = p_upload_id;

  -- Create lecture_notes entry WITH material_type and level
  INSERT INTO lecture_notes (
    course_id, uploaded_by, file_path, title, file_size,
    uploaded_by_display, material_type, level
  )
  VALUES (
    v_upload.course_id, v_upload.user_id, v_upload.file_path,
    v_upload.title, v_upload.file_size, v_uploader_name,
    COALESCE(v_upload.material_type, 'lecture_note'),
    v_course_level
  );

  -- Upsert contributor points
  INSERT INTO contributor_points (user_id, total_points, approved_count, pending_count)
  VALUES (v_upload.user_id, 10, 1, -1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = contributor_points.total_points + 10,
    approved_count = contributor_points.approved_count + 1,
    pending_count = GREATEST(0, contributor_points.pending_count - 1),
    updated_at = now();

  -- Badge checks
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

  -- Notify uploader
  INSERT INTO user_notifications (user_id, notification_type, department_id, metadata)
  VALUES (v_upload.user_id, 'upload_approved', v_upload.department_id,
    jsonb_build_object('title', v_upload.title, 'note', COALESCE(p_note, ''))
  );
END;
$$;

-- 6. Update the courses_with_note_counts view to include breakdown by material_type
-- (drop and recreate with the new column)
CREATE OR REPLACE VIEW public.courses_with_note_counts AS
SELECT
  c.*,
  COUNT(ln.id) AS note_count,
  COUNT(ln.id) FILTER (WHERE ln.material_type = 'lecture_note') AS lecture_note_count,
  COUNT(ln.id) FILTER (WHERE ln.material_type = 'past_question') AS past_question_count,
  COUNT(ln.id) FILTER (WHERE ln.material_type = 'handout') AS handout_count,
  COUNT(ln.id) FILTER (WHERE ln.material_type = 'assignment') AS assignment_count,
  COUNT(ln.id) FILTER (WHERE ln.material_type = 'tutorial') AS tutorial_count,
  COUNT(ln.id) FILTER (WHERE ln.material_type = 'other') AS other_count
FROM public.courses c
LEFT JOIN public.lecture_notes ln ON ln.course_id = c.id
GROUP BY c.id;

-- Allow anon to read faculties (for landing page browsing without login)
DROP POLICY IF EXISTS "Anyone can view faculties" ON public.faculties;
CREATE POLICY "Anyone can view faculties"
  ON public.faculties FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- Allow anon to read departments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'departments' AND policyname = 'Anon can view visible departments'
  ) THEN
    CREATE POLICY "Anon can view visible departments"
      ON public.departments FOR SELECT
      TO anon
      USING (is_visible = true);
  END IF;
END;
$$;

-- Allow anon to read courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'courses' AND policyname = 'Anon can view courses'
  ) THEN
    CREATE POLICY "Anon can view courses"
      ON public.courses FOR SELECT
      TO anon
      USING (true);
  END IF;
END;
$$;
