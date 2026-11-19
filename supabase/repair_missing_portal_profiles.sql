-- Run as the project administrator in Supabase SQL Editor.
-- Repairs missing portal profiles; existing profiles and staff roles stay unchanged.
begin;
lock table public.portal_profiles in share row exclusive mode;
select setval('public.student_number_seq', greatest(
  (select last_value from public.student_number_seq),
  coalesce((select max(substring(student_number from '[0-9]+$')::bigint)
            from public.portal_profiles where student_number ~ '^TI-[0-9]{2}-[0-9]+$'), 1)
), true);

create or replace function public.portal_create_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.portal_profiles(id, student_number, full_name, role)
  values (new.id,
    'TI-' || to_char(now(), 'YY') || '-' || lpad(nextval('public.student_number_seq')::text, 6, '0'),
    coalesce(new.raw_user_meta_data->>'full_name',''), 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists portal_auth_user_created on auth.users;
create trigger portal_auth_user_created after insert on auth.users
for each row execute function public.portal_create_profile();

insert into public.portal_profiles(id, student_number, full_name, role)
select u.id,
  'TI-' || to_char(now(), 'YY') || '-' || lpad(nextval('public.student_number_seq')::text, 6, '0'),
  coalesce(u.raw_user_meta_data->>'full_name',''), 'student'
from auth.users u
where not exists (select 1 from public.portal_profiles p where p.id=u.id)
on conflict (id) do nothing;
commit;

-- Should return zero rows once every account has a profile.
select u.id, u.email from auth.users u
left join public.portal_profiles p on p.id=u.id where p.id is null;
