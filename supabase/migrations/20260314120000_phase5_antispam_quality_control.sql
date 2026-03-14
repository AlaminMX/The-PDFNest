-- ============================================================
-- PHASE 5: Anti-Spam + Quality Control
-- ============================================================

-- ── 2. Required field validation constraints ─────────────────
ALTER TABLE public.community_uploads
  ADD CONSTRAINT community_uploads_level_valid
  CHECK (level IN (100, 200, 300, 400, 500));

ALTER TABLE public.community_uploads
  ADD CONSTRAINT community_uploads_semester_valid
  CHECK (semester IN ('first', 'second'));

ALTER TABLE public.community_uploads
  ADD CONSTRAINT community_uploads_material_type_valid
  CHECK (material_type IN ('lecture_note', 'past_question', 'assignment', 'summary', 'other'));

ALTER TABLE public.community_uploads
  ADD CONSTRAINT community_uploads_status_valid
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.community_uploads
  ADD CONSTRAINT community_uploads_title_not_blank
  CHECK (char_length(trim(title)) > 0);

-- ── 3. Daily upload count helper ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_daily_upload_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM community_uploads
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
    AND created_at <  date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day';
$$;

-- ── 4. Server-side daily limit trigger (10 uploads/day) ──────
CREATE OR REPLACE FUNCTION public.enforce_daily_upload_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_limit constant integer := 10;
BEGIN
  SELECT get_user_daily_upload_count(NEW.user_id) INTO v_count;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Daily upload limit of % reached. Please try again tomorrow.', v_limit;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_daily_upload_limit
  BEFORE INSERT ON public.community_uploads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_upload_limit();

-- ── 5. Improved duplicate detection (also checks lecture_notes) ──
CREATE OR REPLACE FUNCTION public.check_duplicate_upload(
  p_file_hash text,
  p_file_name text,
  p_file_size bigint,
  p_course_id uuid
)
RETURNS TABLE(id uuid, title text, original_file_name text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cu.id, cu.title, cu.original_file_name, cu.status, cu.created_at
  FROM community_uploads cu
  WHERE cu.course_id = p_course_id
    AND (
      (p_file_hash IS NOT NULL AND cu.file_hash = p_file_hash)
      OR (cu.original_file_name = p_file_name AND cu.file_size = p_file_size)
    )
  UNION ALL
  SELECT ln.id, ln.title, ''::text, 'approved'::text, ln.created_at
  FROM lecture_notes ln
  WHERE ln.course_id = p_course_id
    AND ln.file_path IN (
      SELECT file_path FROM community_uploads
      WHERE (p_file_hash IS NOT NULL AND file_hash = p_file_hash)
         OR (original_file_name = p_file_name AND file_size = p_file_size)
    )
  LIMIT 5;
$$;

-- ── 6. Performance indexes ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_community_uploads_user_created
  ON public.community_uploads (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_uploads_file_hash
  ON public.community_uploads (file_hash)
  WHERE file_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_uploads_status
  ON public.community_uploads (status);

CREATE INDEX IF NOT EXISTS idx_community_uploads_dept_status
  ON public.community_uploads (department_id, status);
