-- Department order is saved once per drop, in a single transaction.
create function public.admin_set_department_order(_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(public.has_role((select auth.uid()), 'admin'::public.app_role), false) then
    raise exception 'Admin privileges required' using errcode = '42501';
  end if;

  lock table public.departments in share row exclusive mode;

  if _ordered_ids is null
    or cardinality(_ordered_ids) <> (select count(*) from public.departments)
    or cardinality(_ordered_ids) <> (
      select count(distinct d.id)
      from unnest(_ordered_ids) as supplied(id)
      join public.departments d on d.id = supplied.id
    )
  then
    raise exception 'Department list changed. Refresh and try again.' using errcode = '22023';
  end if;

  update public.departments d
  set display_order = sorted.position::integer
  from unnest(_ordered_ids) with ordinality as sorted(id, position)
  where sorted.id = d.id and d.display_order is distinct from sorted.position::integer;
end;
$$;

revoke all on function public.admin_set_department_order(uuid[]) from public, anon;
grant execute on function public.admin_set_department_order(uuid[]) to authenticated;

-- Rep privileges use the assigned department in the profile.
-- Admin service functions can still change assignments.
create function public.guard_rep_department_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
    and public.has_role((select auth.uid()), 'rep'::public.app_role)
    and not public.has_role((select auth.uid()), 'admin'::public.app_role)
  then
    if tg_op = 'INSERT' then
      if new.department_id is not null or new.faculty_id is not null then
        raise exception 'An administrator must assign your department' using errcode = '42501';
      end if;
    elsif new.department_id is distinct from old.department_id
      or new.faculty_id is distinct from old.faculty_id
    then
      raise exception 'An administrator must assign your department' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_rep_department_assignment() from public, anon, authenticated;

create trigger guard_rep_department_assignment
before insert or update of department_id, faculty_id on public.profiles
for each row execute function public.guard_rep_department_assignment();

-- Keep the public academic catalog available via signed URLs.
-- Community submissions remain private until a review publishes a catalog row.
update storage.buckets set public = false where id = 'school_pdfs';
drop policy if exists "Anyone can view school PDFs" on storage.objects;
drop policy if exists "Public read access for school_pdfs" on storage.objects;
drop policy if exists "Anyone can read school_pdfs for viewing" on storage.objects;
drop policy if exists "Public read school_pdfs (approved community only)" on storage.objects;
create schema if not exists pdfnest_private;
grant usage on schema pdfnest_private to anon, authenticated;

create function pdfnest_private.is_published_community_file(_file_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_uploads u
    where u.file_path = _file_path and u.status = 'approved'
  ) and (
    exists (select 1 from public.lecture_notes n where n.file_path = _file_path)
    or exists (select 1 from public.past_questions q where q.file_path = _file_path)
  );
$$;
revoke all on function pdfnest_private.is_published_community_file(text) from public;
grant execute on function pdfnest_private.is_published_community_file(text) to anon, authenticated;

create policy "Visitors can read published school materials"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'school_pdfs'
  and (
    name not like 'community/%'
    or pdfnest_private.is_published_community_file(name)
  )
);

create policy "Contributors and reviewers can read their submissions"
on storage.objects for select to authenticated
using (
  bucket_id = 'school_pdfs'
  and name like 'community/%'
  and (
    (storage.foldername(name))[2] = (select auth.uid())::text
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
    -- The existing upload SELECT policies limit this to the assigned department.
    or exists (select 1 from public.community_uploads u where u.file_path = storage.objects.name)
  )
);

drop policy if exists "Users can insert own uploads" on public.community_uploads;
create policy "Users can submit their own pending uploads"
on public.community_uploads for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (storage.foldername(file_path))[1] = 'community'
  and (storage.foldername(file_path))[2] = (select auth.uid())::text
  and status = 'pending'
  and reviewed_by is null and reviewed_at is null and review_note is null
);

drop policy if exists "Reps can update department uploads" on public.community_uploads;
drop policy if exists "Service role can insert notifications" on public.user_notifications;

-- Match reviewer identity to the authenticated session before any write.
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
  IF auth.uid() IS NULL OR p_reviewer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Reviewer identity does not match the session' USING ERRCODE = '42501';
  END IF;
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
    AND course_id IS NOT NULL
    AND pq_course_id IS NULL
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
  IF auth.uid() IS NULL OR p_reviewer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Reviewer identity does not match the session' USING ERRCODE = '42501';
  END IF;
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
    AND pq_course_id IS NOT NULL
  RETURNING * INTO v_upload;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload not found or already reviewed';
  END IF;

  IF NOT has_role(p_reviewer_id, 'admin') AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_reviewer_id AND department_id = v_upload.department_id
  ) THEN
    RAISE EXCEPTION 'Rep can only approve uploads in their department' USING ERRCODE = '42501';
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
  IF auth.uid() IS NULL OR p_reviewer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Reviewer identity does not match the session' USING ERRCODE = '42501';
  END IF;
  IF NOT (has_role(p_reviewer_id, 'admin') OR has_role(p_reviewer_id, 'rep')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_upload FROM community_uploads WHERE id = p_upload_id AND status = 'pending' FOR UPDATE;
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

-- Retire approval overloads whose reviewer identity was supplied by the caller.
drop function if exists public.approve_community_upload(uuid, uuid, text);
drop function if exists public.approve_pq_upload(uuid, uuid, text);

revoke execute on function public.approve_community_upload(uuid, uuid, text, text) from public, anon;
revoke execute on function public.approve_pq_upload(uuid, uuid, text, text) from public, anon;
revoke execute on function public.reject_community_upload(uuid, uuid, text) from public, anon;
grant execute on function public.approve_community_upload(uuid, uuid, text, text) to authenticated;
grant execute on function public.approve_pq_upload(uuid, uuid, text, text) to authenticated;
grant execute on function public.reject_community_upload(uuid, uuid, text) to authenticated;

create policy "Admins can move lecture notes between courses"
on public.lecture_notes for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Merge both catalog records and dependent material in one transaction.
create function public.admin_merge_pending_course(_source_id uuid, _target_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_course public.courses%rowtype;
  target_course public.courses%rowtype;
begin
  if not coalesce(public.has_role((select auth.uid()), 'admin'::public.app_role), false) then
    raise exception 'Admin privileges required' using errcode = '42501';
  end if;

  perform 1 from public.courses
  where id in (_source_id, _target_id)
  order by id for update;

  select * into source_course from public.courses where id = _source_id;
  select * into target_course from public.courses where id = _target_id;

  if source_course.id is null or target_course.id is null
    or source_course.status is distinct from 'pending'
    or target_course.status is distinct from 'approved'
    or source_course.department_id is distinct from target_course.department_id
    or source_course.level is distinct from target_course.level
  then
    raise exception 'Select an approved course in the same department and level' using errcode = '22023';
  end if;

  update public.community_uploads set course_id = _target_id where course_id = _source_id;
  update public.lecture_notes set course_id = _target_id where course_id = _source_id;
  update public.course_timetable_slots set course_id = _target_id where course_id = _source_id;
  if exists (select 1 from public.community_uploads where course_id = _source_id)
    or exists (select 1 from public.lecture_notes where course_id = _source_id)
    or exists (select 1 from public.course_timetable_slots where course_id = _source_id)
  then
    raise exception 'Could not move all material to the target course' using errcode = '42501';
  end if;

  delete from public.courses where id = _source_id;
  if not found then
    raise exception 'Could not remove the source course' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.admin_merge_pending_course(uuid, uuid) from public, anon;
grant execute on function public.admin_merge_pending_course(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
