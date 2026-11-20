-- Server functions need to read approval messages before generating agreements.
-- This grant does not change student access or document approval status.
begin;
grant select on public.student_notifications to service_role;
notify pgrst, 'reload schema';
commit;
