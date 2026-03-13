-- Structured activity and security logging
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default timezone('utc', now()),
  user_id text not null default 'guest',
  session_id text not null,
  action text not null,
  resource text not null,
  status text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_activity_events_timestamp on public.activity_events (timestamp desc);
create index if not exists idx_activity_events_user_id on public.activity_events (user_id);
create index if not exists idx_activity_events_session_id on public.activity_events (session_id);
create index if not exists idx_activity_events_action on public.activity_events (action);

alter table public.activity_events enable row level security;

-- Block direct client table access; access should be mediated by secure server paths.
revoke all on table public.activity_events from anon, authenticated;

-- Admins can view structured logs.
drop policy if exists "Admins can view structured activity logs" on public.activity_events;
create policy "Admins can view structured activity logs"
on public.activity_events
for select
using (public.has_role(auth.uid(), 'admin'));

-- Optional least-privilege role for insert-only log writers.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'activity_logger') then
    create role activity_logger nologin;
  end if;
end
$$;

grant insert on public.activity_events to activity_logger;

create table if not exists public.failed_login_attempts (
  id bigserial primary key,
  identifier text not null,
  attempted_at timestamptz not null default timezone('utc', now()),
  ip_address inet,
  user_agent text,
  session_id text,
  context jsonb not null default '{}'::jsonb
);

create index if not exists idx_failed_login_identifier_attempted_at
  on public.failed_login_attempts (identifier, attempted_at desc);

alter table public.failed_login_attempts enable row level security;
revoke all on table public.failed_login_attempts from anon, authenticated;

drop policy if exists "Admins can view failed login attempts" on public.failed_login_attempts;
create policy "Admins can view failed login attempts"
on public.failed_login_attempts
for select
using (public.has_role(auth.uid(), 'admin'));

grant insert on public.failed_login_attempts to activity_logger;

create or replace function public.insert_activity_event(
  p_timestamp timestamptz,
  p_user_id text,
  p_session_id text,
  p_action text,
  p_resource text,
  p_status text,
  p_context jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_events (timestamp, user_id, session_id, action, resource, status, context)
  values (
    coalesce(p_timestamp, timezone('utc', now())),
    coalesce(nullif(trim(p_user_id), ''), 'guest'),
    coalesce(nullif(trim(p_session_id), ''), gen_random_uuid()::text),
    upper(coalesce(nullif(trim(p_action), ''), 'UNKNOWN')),
    coalesce(nullif(trim(p_resource), ''), '/unknown'),
    coalesce(nullif(trim(p_status), ''), 'UNKNOWN'),
    coalesce(p_context, '{}'::jsonb)
  );
$$;

create or replace function public.record_failed_login_attempt(
  p_identifier text,
  p_ip_address inet,
  p_user_agent text,
  p_session_id text,
  p_context jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_fail_count integer;
begin
  insert into public.failed_login_attempts(identifier, ip_address, user_agent, session_id, context)
  values (
    coalesce(nullif(trim(p_identifier), ''), 'unknown'),
    p_ip_address,
    p_user_agent,
    p_session_id,
    coalesce(p_context, '{}'::jsonb)
  );

  select count(*)::integer
  into recent_fail_count
  from public.failed_login_attempts
  where identifier = coalesce(nullif(trim(p_identifier), ''), 'unknown')
    and attempted_at >= timezone('utc', now()) - interval '15 minutes';

  return recent_fail_count;
end;
$$;

revoke all on function public.insert_activity_event(timestamptz, text, text, text, text, text, jsonb) from public;
revoke all on function public.record_failed_login_attempt(text, inet, text, text, jsonb) from public;

grant execute on function public.insert_activity_event(timestamptz, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.record_failed_login_attempt(text, inet, text, text, jsonb) to service_role;
