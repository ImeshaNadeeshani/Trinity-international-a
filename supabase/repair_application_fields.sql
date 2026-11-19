begin;
alter table public.student_applications
  add column if not exists intake text not null default '',
  add column if not exists institution text not null default '';
grant update(intake,institution) on public.student_applications to authenticated;
notify pgrst, 'reload schema';
commit;
