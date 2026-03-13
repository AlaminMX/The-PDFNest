create extension if not exists pgcrypto;

create table if not exists public.community_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  faculty_id uuid null references public.faculties(id) on delete set null,
  department_id uuid null references public.departments(id) on delete set null,
  course_id uuid null references public.courses(id) on delete set null,
  level integer not null,
  semester text not null,
  title text not null,
  description text null,
  material_type text not null,
  file_path text not null,
  original_file_name text not null,
  file_size bigint not null,
  file_hash text null,
  status text not null default 'pending',
  reviewed_by uuid null references public.profiles(id) on delete set null,
  review_note text null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint community_uploads_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint community_uploads_material_type_check check (material_type in ('lecture_note', 'past_question', 'assignment', 'summary', 'other'))
);

create index if not exists idx_community_uploads_status on public.community_uploads(status);
create index if not exists idx_community_uploads_department on public.community_uploads(department_id);
create index if not exists idx_community_uploads_created_at on public.community_uploads(created_at desc);
create index if not exists idx_community_uploads_hash on public.community_uploads(file_hash);

create table if not exists public.contributor_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  total_points integer not null default 0,
  approved_count integer not null default 0,
  rejected_count integer not null default 0,
  pending_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.contributor_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_type text not null,
  earned_at timestamptz not null default now(),
  constraint contributor_badges_unique unique (user_id, badge_type)
);

alter table public.community_uploads enable row level security;
alter table public.contributor_points enable row level security;
alter table public.contributor_badges enable row level security;

drop policy if exists "Users can insert own community uploads" on public.community_uploads;
create policy "Users can insert own community uploads"
on public.community_uploads
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can select own community uploads" on public.community_uploads;
create policy "Users can select own community uploads"
on public.community_uploads
for select
using (auth.uid() = user_id);

drop policy if exists "Admins can manage all community uploads" on public.community_uploads;
create policy "Admins can manage all community uploads"
on public.community_uploads
for all
using (has_role(auth.uid(), 'admin'))
with check (has_role(auth.uid(), 'admin'));

drop policy if exists "Reps can review department uploads" on public.community_uploads;
create policy "Reps can review department uploads"
on public.community_uploads
for select
using (
  has_role(auth.uid(), 'rep')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.department_id = community_uploads.department_id
  )
);

drop policy if exists "Reps can update department uploads" on public.community_uploads;
create policy "Reps can update department uploads"
on public.community_uploads
for update
using (
  has_role(auth.uid(), 'rep')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.department_id = community_uploads.department_id
  )
)
with check (
  has_role(auth.uid(), 'rep')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.department_id = community_uploads.department_id
  )
);

drop policy if exists "Users can view own contributor points" on public.contributor_points;
create policy "Users can view own contributor points"
on public.contributor_points
for select
using (auth.uid() = user_id);

drop policy if exists "Admins can view all contributor points" on public.contributor_points;
create policy "Admins can view all contributor points"
on public.contributor_points
for select
using (has_role(auth.uid(), 'admin'));

drop policy if exists "Users can view own contributor badges" on public.contributor_badges;
create policy "Users can view own contributor badges"
on public.contributor_badges
for select
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can view contributor badges" on public.contributor_badges;
create policy "Authenticated users can view contributor badges"
on public.contributor_badges
for select
using (auth.uid() is not null);

create or replace function public.check_duplicate_upload(
  p_file_hash text,
  p_file_name text,
  p_file_size bigint,
  p_course_id uuid
)
returns table (
  id uuid,
  title text,
  original_file_name text,
  file_size bigint,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select cu.id, cu.title, cu.original_file_name, cu.file_size, cu.status, cu.created_at
  from public.community_uploads cu
  where cu.course_id = p_course_id
    and (
      (p_file_hash is not null and cu.file_hash = p_file_hash)
      or (cu.original_file_name = p_file_name and cu.file_size = p_file_size)
    )
  order by cu.created_at desc
  limit 10;
$$;

create or replace function public.approve_community_upload(
  p_upload_id uuid,
  p_reviewer_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upload public.community_uploads%rowtype;
  v_reviewer_name text;
  v_reviewer_department uuid;
  v_is_admin boolean;
  v_is_rep boolean;
begin
  v_is_admin := has_role(p_reviewer_id, 'admin');
  v_is_rep := has_role(p_reviewer_id, 'rep');

  if not v_is_admin and not v_is_rep then
    raise exception 'Access denied';
  end if;

  select * into v_upload from public.community_uploads where id = p_upload_id for update;
  if not found then
    raise exception 'Upload not found';
  end if;

  if v_upload.status <> 'pending' then
    raise exception 'Only pending uploads can be approved';
  end if;

  if v_is_rep then
    select department_id into v_reviewer_department from public.profiles where id = p_reviewer_id;
    if v_reviewer_department is null or v_reviewer_department <> v_upload.department_id then
      raise exception 'Rep can only approve uploads in their department';
    end if;
  end if;

  update public.community_uploads
  set status = 'approved',
      reviewed_by = p_reviewer_id,
      review_note = p_note,
      reviewed_at = now()
  where id = p_upload_id;

  select coalesce(display_name, full_name, email, 'Moderator')
  into v_reviewer_name
  from public.profiles
  where id = p_reviewer_id;

  insert into public.lecture_notes (course_id, title, file_path, file_size, uploaded_by, uploaded_by_display)
  select v_upload.course_id,
         v_upload.title,
         v_upload.file_path,
         v_upload.file_size,
         v_upload.user_id,
         coalesce(v_reviewer_name, 'Moderator')
  where not exists (
    select 1 from public.lecture_notes ln
    where ln.course_id = v_upload.course_id
      and ln.file_path = v_upload.file_path
  );

  insert into public.contributor_points (user_id, total_points, approved_count, pending_count, updated_at)
  values (v_upload.user_id, 10, 1, 0, now())
  on conflict (user_id)
  do update set
    total_points = contributor_points.total_points + 10,
    approved_count = contributor_points.approved_count + 1,
    pending_count = greatest(contributor_points.pending_count - 1, 0),
    updated_at = now();

  insert into public.contributor_badges (user_id, badge_type)
  values (v_upload.user_id, 'first_upload')
  on conflict (user_id, badge_type) do nothing;

  insert into public.user_notifications (user_id, department_id, notification_type, metadata)
  values (
    v_upload.user_id,
    v_upload.department_id,
    'upload_approved',
    jsonb_build_object(
      'upload_id', v_upload.id,
      'title', v_upload.title,
      'review_note', p_note
    )
  );
end;
$$;

create or replace function public.reject_community_upload(
  p_upload_id uuid,
  p_reviewer_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upload public.community_uploads%rowtype;
  v_reviewer_department uuid;
  v_is_admin boolean;
  v_is_rep boolean;
begin
  v_is_admin := has_role(p_reviewer_id, 'admin');
  v_is_rep := has_role(p_reviewer_id, 'rep');

  if not v_is_admin and not v_is_rep then
    raise exception 'Access denied';
  end if;

  select * into v_upload from public.community_uploads where id = p_upload_id for update;
  if not found then
    raise exception 'Upload not found';
  end if;

  if v_upload.status <> 'pending' then
    raise exception 'Only pending uploads can be rejected';
  end if;

  if v_is_rep then
    select department_id into v_reviewer_department from public.profiles where id = p_reviewer_id;
    if v_reviewer_department is null or v_reviewer_department <> v_upload.department_id then
      raise exception 'Rep can only reject uploads in their department';
    end if;
  end if;

  update public.community_uploads
  set status = 'rejected',
      reviewed_by = p_reviewer_id,
      review_note = p_note,
      reviewed_at = now()
  where id = p_upload_id;

  insert into public.contributor_points (user_id, rejected_count, pending_count, updated_at)
  values (v_upload.user_id, 1, 0, now())
  on conflict (user_id)
  do update set
    rejected_count = contributor_points.rejected_count + 1,
    pending_count = greatest(contributor_points.pending_count - 1, 0),
    updated_at = now();

  insert into public.user_notifications (user_id, department_id, notification_type, metadata)
  values (
    v_upload.user_id,
    v_upload.department_id,
    'upload_rejected',
    jsonb_build_object(
      'upload_id', v_upload.id,
      'title', v_upload.title,
      'review_note', coalesce(p_note, 'No reason provided')
    )
  );
end;
$$;

grant execute on function public.check_duplicate_upload(text, text, bigint, uuid) to authenticated;
grant execute on function public.approve_community_upload(uuid, uuid, text) to authenticated;
grant execute on function public.reject_community_upload(uuid, uuid, text) to authenticated;

create or replace view public.contributor_leaderboard as
select
  cp.user_id,
  coalesce(p.display_name, p.full_name, split_part(p.email, '@', 1)) as display_name,
  p.avatar_url,
  p.department_id,
  cp.total_points,
  cp.approved_count,
  cp.rejected_count,
  cp.pending_count,
  rank() over (order by cp.total_points desc, cp.approved_count desc, cp.updated_at asc) as rank
from public.contributor_points cp
join public.profiles p on p.id = cp.user_id;

grant select on public.contributor_leaderboard to authenticated;
