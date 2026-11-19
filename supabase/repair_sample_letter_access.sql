-- The sample generator reads issued letters using its server-side service role.
grant select on public.approval_letters to service_role;
notify pgrst, 'reload schema';
