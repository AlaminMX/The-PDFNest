
-- 1) Normalize existing course codes and enforce case-insensitive uniqueness per department.
UPDATE public.courses SET code = upper(btrim(code)) WHERE code <> upper(btrim(code));

-- Existing unique constraint (department_id, code) is now effectively case-insensitive because we normalize on write.
-- Add an explicit case-insensitive unique index so ensure_course can use ON CONFLICT reliably even if a row
-- ever slips in without normalization.
DROP INDEX IF EXISTS public.courses_unique_dept_code_ci;
CREATE UNIQUE INDEX courses_unique_dept_code_ci
  ON public.courses (department_id, upper(btrim(code)));

-- 2) Faculty-scope helper.
CREATE OR REPLACE FUNCTION public.rep_same_faculty(_user_id uuid, _dept_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.departments home ON home.id = p.department_id
    JOIN public.departments target ON target.id = _dept_id
    WHERE p.id = _user_id
      AND home.faculty_id IS NOT NULL
      AND home.faculty_id = target.faculty_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.rep_same_faculty(uuid, uuid) TO authenticated;

-- 3) Create-or-reuse a course. Faculty-scoped for reps, unrestricted for admins.
CREATE OR REPLACE FUNCTION public.ensure_course(
  _dept_id uuid,
  _code text,
  _name text,
  _level integer,
  _semester text,
  _credit_units integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_code text := upper(btrim(coalesce(_code, '')));
  v_name text := btrim(coalesce(_name, ''));
  v_course_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_code = '' OR v_name = '' THEN
    RAISE EXCEPTION 'invalid_course_input';
  END IF;
  IF _semester NOT IN ('first','second') THEN
    RAISE EXCEPTION 'invalid_semester';
  END IF;

  IF NOT (
    public.has_role(v_caller, 'admin'::app_role)
    OR (public.has_role(v_caller, 'rep'::app_role) AND public.rep_same_faculty(v_caller, _dept_id))
  ) THEN
    RAISE EXCEPTION 'not_authorized_for_department';
  END IF;

  -- Return existing course (any level/semester) with the same normalized code in the department.
  SELECT id INTO v_course_id
  FROM public.courses
  WHERE department_id = _dept_id
    AND upper(btrim(code)) = v_code
  LIMIT 1;

  IF v_course_id IS NOT NULL THEN
    RETURN v_course_id;
  END IF;

  INSERT INTO public.courses (department_id, code, name, level, semester, credit_units, status, suggested_by)
  VALUES (_dept_id, v_code, v_name, _level, _semester, coalesce(_credit_units, 0), 'approved', v_caller)
  ON CONFLICT (department_id, upper(btrim(code))) DO UPDATE
    SET name = COALESCE(NULLIF(btrim(public.courses.name), ''), EXCLUDED.name)
  RETURNING id INTO v_course_id;

  RETURN v_course_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_course(uuid, text, text, integer, text, integer) TO authenticated;

-- 4) Secure lecture-note insert used by the rep upload flow. Handles duplicate titles.
CREATE OR REPLACE FUNCTION public.rep_upload_lecture_note(
  _course_id uuid,
  _file_path text,
  _title text,
  _file_size bigint,
  _display_name text,
  _material_type text DEFAULT 'lecture_note',
  _level integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_dept uuid;
  v_level integer;
  v_title text := btrim(coalesce(_title, ''));
  v_final_title text;
  v_counter int := 2;
  v_note_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_title = '' THEN
    RAISE EXCEPTION 'title_required';
  END IF;

  SELECT department_id, level INTO v_dept, v_level
  FROM public.courses WHERE id = _course_id;
  IF v_dept IS NULL THEN
    RAISE EXCEPTION 'course_not_found';
  END IF;

  IF NOT (
    public.has_role(v_caller, 'admin'::app_role)
    OR (public.has_role(v_caller, 'rep'::app_role) AND public.rep_same_faculty(v_caller, v_dept))
  ) THEN
    RAISE EXCEPTION 'not_authorized_for_department';
  END IF;

  -- Skip exact duplicate (same file_path already in this course).
  SELECT id INTO v_note_id
  FROM public.lecture_notes
  WHERE course_id = _course_id AND file_path = _file_path
  LIMIT 1;
  IF v_note_id IS NOT NULL THEN
    RETURN v_note_id;
  END IF;

  -- Auto-number title on collision.
  v_final_title := v_title;
  WHILE EXISTS (
    SELECT 1 FROM public.lecture_notes
    WHERE course_id = _course_id AND lower(title) = lower(v_final_title)
  ) LOOP
    v_final_title := v_title || ' {' || v_counter || '}';
    v_counter := v_counter + 1;
  END LOOP;

  INSERT INTO public.lecture_notes (
    course_id, uploaded_by, uploaded_by_display, title, file_path, file_size, material_type, level
  ) VALUES (
    _course_id, v_caller, coalesce(_display_name, 'Anonymous'), v_final_title,
    _file_path, _file_size, coalesce(_material_type, 'lecture_note'),
    coalesce(_level, v_level, 100)
  )
  RETURNING id INTO v_note_id;

  RETURN v_note_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rep_upload_lecture_note(uuid, text, text, bigint, text, text, integer) TO authenticated;

-- 5) Copy an existing lecture note into one or more departments without re-uploading the file.
-- Returns a JSON array with per-destination outcomes.
CREATE OR REPLACE FUNCTION public.rep_copy_lecture_note(
  _source_note_id uuid,
  _target_dept_ids uuid[],
  _target_level integer,
  _target_semester text,
  _target_course_code text,
  _target_course_name text,
  _title_override text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_source public.lecture_notes%ROWTYPE;
  v_result jsonb := '[]'::jsonb;
  v_dept uuid;
  v_course_id uuid;
  v_existing uuid;
  v_title text;
  v_final_title text;
  v_counter int;
  v_note_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _target_semester NOT IN ('first','second') THEN
    RAISE EXCEPTION 'invalid_semester';
  END IF;

  SELECT * INTO v_source FROM public.lecture_notes WHERE id = _source_note_id;
  IF v_source.id IS NULL THEN
    RAISE EXCEPTION 'source_not_found';
  END IF;

  v_title := btrim(coalesce(_title_override, v_source.title));

  FOREACH v_dept IN ARRAY _target_dept_ids LOOP
    BEGIN
      IF NOT (
        public.has_role(v_caller, 'admin'::app_role)
        OR (public.has_role(v_caller, 'rep'::app_role) AND public.rep_same_faculty(v_caller, v_dept))
      ) THEN
        v_result := v_result || jsonb_build_array(jsonb_build_object(
          'department_id', v_dept, 'status', 'failed', 'reason', 'not_authorized'
        ));
        CONTINUE;
      END IF;

      v_course_id := public.ensure_course(
        v_dept, _target_course_code, _target_course_name, _target_level, _target_semester, 0
      );

      -- Skip if the same file already exists in the destination course.
      SELECT id INTO v_existing
      FROM public.lecture_notes
      WHERE course_id = v_course_id AND file_path = v_source.file_path
      LIMIT 1;
      IF v_existing IS NOT NULL THEN
        v_result := v_result || jsonb_build_array(jsonb_build_object(
          'department_id', v_dept, 'status', 'skipped', 'reason', 'already_exists', 'note_id', v_existing
        ));
        CONTINUE;
      END IF;

      -- Auto-number title on collision within the destination course.
      v_final_title := v_title;
      v_counter := 2;
      WHILE EXISTS (
        SELECT 1 FROM public.lecture_notes
        WHERE course_id = v_course_id AND lower(title) = lower(v_final_title)
      ) LOOP
        v_final_title := v_title || ' {' || v_counter || '}';
        v_counter := v_counter + 1;
      END LOOP;

      INSERT INTO public.lecture_notes (
        course_id, uploaded_by, uploaded_by_display, title, file_path, file_size, material_type, level
      ) VALUES (
        v_course_id, v_source.uploaded_by, v_source.uploaded_by_display, v_final_title,
        v_source.file_path, v_source.file_size, v_source.material_type, _target_level
      )
      RETURNING id INTO v_note_id;

      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'department_id', v_dept, 'status', 'copied', 'note_id', v_note_id, 'course_id', v_course_id
      ));
    EXCEPTION WHEN OTHERS THEN
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'department_id', v_dept, 'status', 'failed', 'reason', SQLERRM
      ));
    END;
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rep_copy_lecture_note(uuid, uuid[], integer, text, text, text, text) TO authenticated;

-- 6) Reference-count helper: lets the app decide if a storage object is still needed.
CREATE OR REPLACE FUNCTION public.file_path_reference_count(_file_path text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.lecture_notes WHERE file_path = _file_path;
$$;

GRANT EXECUTE ON FUNCTION public.file_path_reference_count(text) TO authenticated;
