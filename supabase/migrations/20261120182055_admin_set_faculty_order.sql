create function public.admin_set_faculty_order(_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(public.has_role((select auth.uid()), 'admin'::public.app_role), false) then
    raise exception 'Admin privileges required' using errcode = '42501';
  end if;

  lock table public.faculties in share row exclusive mode;

  if _ordered_ids is null
    or cardinality(_ordered_ids) <> (select count(*) from public.faculties)
    or cardinality(_ordered_ids) <> (
      select count(distinct faculty.id)
      from unnest(_ordered_ids) as supplied(id)
      join public.faculties faculty on faculty.id = supplied.id
    )
  then
    raise exception 'Faculty list changed. Refresh and try again.' using errcode = '22023';
  end if;

  update public.faculties faculty
  set display_order = sorted.position::integer
  from unnest(_ordered_ids) with ordinality as sorted(id, position)
  where faculty.id = sorted.id and faculty.display_order is distinct from sorted.position::integer;
end;
$$;

revoke all on function public.admin_set_faculty_order(uuid[]) from public, anon;
grant execute on function public.admin_set_faculty_order(uuid[]) to authenticated;
