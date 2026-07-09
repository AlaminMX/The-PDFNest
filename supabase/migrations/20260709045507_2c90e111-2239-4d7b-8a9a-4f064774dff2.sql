
CREATE OR REPLACE FUNCTION public.admin_delete_course(_course_id uuid)
RETURNS TABLE(orphaned_file_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  -- Collect file paths whose only remaining reference is via this course.
  -- After the course is deleted, cascading deletes remove those lecture_notes rows,
  -- so paths with ref_count = notes_in_this_course become truly orphaned.
  RETURN QUERY
  WITH course_notes AS (
    SELECT file_path FROM public.lecture_notes WHERE course_id = _course_id
  ),
  ref_counts AS (
    SELECT ln.file_path, COUNT(*)::int AS total_refs,
           (SELECT COUNT(*) FROM course_notes cn WHERE cn.file_path = ln.file_path)::int AS in_course_refs
    FROM public.lecture_notes ln
    WHERE ln.file_path IN (SELECT file_path FROM course_notes)
    GROUP BY ln.file_path
  )
  SELECT rc.file_path
  FROM ref_counts rc
  WHERE rc.total_refs = rc.in_course_refs;

  DELETE FROM public.courses WHERE id = _course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_course(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_course(uuid) TO authenticated;
