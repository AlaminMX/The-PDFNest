-- Admin-only accessors for structured activity logs

create or replace function public.get_admin_activity_events(
  p_limit integer default 500,
  p_offset integer default 0,
  p_action text default null,
  p_search text default null,
  p_session_id text default null
)
returns table (
  id uuid,
  timestamp timestamptz,
  user_id text,
  session_id text,
  action text,
  resource text,
  status text,
  context jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'access denied';
  end if;

  return query
  select
    ae.id,
    ae.timestamp,
    ae.user_id,
    ae.session_id,
    ae.action,
    ae.resource,
    ae.status,
    ae.context
  from public.activity_events ae
  where (p_action is null or ae.action = upper(p_action))
    and (p_session_id is null or ae.session_id = p_session_id)
    and (
      p_search is null
      or ae.user_id ilike '%' || p_search || '%'
      or ae.resource ilike '%' || p_search || '%'
      or ae.action ilike '%' || p_search || '%'
      or ae.status ilike '%' || p_search || '%'
      or ae.context::text ilike '%' || p_search || '%'
    )
  order by ae.timestamp desc
  limit greatest(coalesce(p_limit, 500), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.get_admin_failed_login_events(
  p_limit integer default 250,
  p_offset integer default 0,
  p_search text default null
)
returns table (
  id bigint,
  identifier text,
  attempted_at timestamptz,
  ip_address inet,
  user_agent text,
  session_id text,
  context jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'access denied';
  end if;

  return query
  select
    fla.id,
    fla.identifier,
    fla.attempted_at,
    fla.ip_address,
    fla.user_agent,
    fla.session_id,
    fla.context
  from public.failed_login_attempts fla
  where (
    p_search is null
    or fla.identifier ilike '%' || p_search || '%'
    or coalesce(fla.session_id, '') ilike '%' || p_search || '%'
    or coalesce(host(fla.ip_address), '') ilike '%' || p_search || '%'
    or fla.context::text ilike '%' || p_search || '%'
  )
  order by fla.attempted_at desc
  limit greatest(coalesce(p_limit, 250), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.get_admin_activity_sessions(
  p_limit integer default 200,
  p_offset integer default 0,
  p_search text default null
)
returns table (
  session_id text,
  user_id text,
  started_at timestamptz,
  ended_at timestamptz,
  event_count bigint,
  error_count bigint,
  security_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'access denied';
  end if;

  return query
  select
    ae.session_id,
    max(ae.user_id) as user_id,
    min(ae.timestamp) as started_at,
    max(ae.timestamp) as ended_at,
    count(*) as event_count,
    count(*) filter (where ae.status in ('ERROR', 'FAILURE', 'ALERT')) as error_count,
    count(*) filter (where ae.action in ('LOGIN_FAILED', 'MULTI_FAILED_LOGIN')) as security_count
  from public.activity_events ae
  where (
    p_search is null
    or ae.user_id ilike '%' || p_search || '%'
    or ae.session_id ilike '%' || p_search || '%'
    or ae.context::text ilike '%' || p_search || '%'
  )
  group by ae.session_id
  order by ended_at desc
  limit greatest(coalesce(p_limit, 200), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.get_admin_activity_events(integer, integer, text, text, text) from public;
revoke all on function public.get_admin_failed_login_events(integer, integer, text) from public;
revoke all on function public.get_admin_activity_sessions(integer, integer, text) from public;

grant execute on function public.get_admin_activity_events(integer, integer, text, text, text) to authenticated;
grant execute on function public.get_admin_failed_login_events(integer, integer, text) to authenticated;
grant execute on function public.get_admin_activity_sessions(integer, integer, text) to authenticated;
