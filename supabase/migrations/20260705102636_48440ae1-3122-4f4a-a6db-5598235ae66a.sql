
REVOKE EXECUTE ON FUNCTION public.rep_same_faculty(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_course(uuid, text, text, integer, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rep_upload_lecture_note(uuid, text, text, bigint, text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rep_copy_lecture_note(uuid, uuid[], integer, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.file_path_reference_count(text) FROM PUBLIC, anon;
