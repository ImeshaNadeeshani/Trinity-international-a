begin;
alter table public.student_documents drop constraint if exists student_documents_category_check;
alter table public.student_documents add constraint student_documents_category_check
check(category in ('national_id','nic_front','nic_back','passport','photograph','education','transcript','english_qualification','cv','financial','other'));
notify pgrst, 'reload schema';
commit;
