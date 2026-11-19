-- Run in Supabase SQL Editor as project administrator.
-- Restores the scan function's required rate-limit database objects.
-- Existing counters are preserved; this does not mark any document clean.
begin;
create table if not exists public.portal_rate_limits (
  actor uuid not null,
  action text not null,
  window_start timestamptz not null,
  attempts integer not null,
  primary key(actor,action,window_start)
);
alter table public.portal_rate_limits enable row level security;
create or replace function public.portal_consume_limit(actor uuid, action text, maximum integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare total integer;
begin
  insert into public.portal_rate_limits values(actor,action,date_trunc('hour',now()),1)
  on conflict on constraint portal_rate_limits_pkey
  do update set attempts=portal_rate_limits.attempts+1
  returning attempts into total;
  return total<=maximum;
end;
$$;
revoke all on function public.portal_consume_limit(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.portal_consume_limit(uuid,text,integer) to service_role;
commit;
select to_regprocedure('public.portal_consume_limit(uuid,text,integer)') as rate_limit_function;
