begin;
alter table public.student_notifications add column if not exists approval_letter_id uuid references public.approval_letters(id) on delete set null;
alter table public.student_notifications add column if not exists delivery_key uuid;
create unique index if not exists student_notification_delivery_key on public.student_notifications(delivery_key) where delivery_key is not null;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('student-private-letters','student-private-letters',false,5242880,array['application/pdf'])
on conflict(id) do update set public=false;
drop policy if exists "Approval officers upload letters" on storage.objects;
create policy "Approval officers upload letters" on storage.objects for insert to authenticated
with check(bucket_id='student-private-letters' and public.portal_can_approve() and exists(
select 1 from public.student_applications a where a.id::text=(storage.foldername(name))[2] and a.student_id::text=(storage.foldername(name))[1]));
drop policy if exists "Read issued approval letters" on storage.objects;
create policy "Read issued approval letters" on storage.objects for select to authenticated using(bucket_id='student-private-letters' and exists(select 1 from public.approval_letters l where l.storage_path=name and (l.student_id=auth.uid() or public.portal_is_case_worker())));
create or replace function public.portal_send_approval_letter(app_id uuid,pdf_path text,subject text,body text,request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare app public.student_applications; letter public.approval_letters; notice_id uuid;
begin
 if not public.portal_can_approve() then raise exception 'Authorized approval officer required';end if;
 if request_id is null or length(trim(subject)) not between 1 and 180 or length(trim(body)) not between 1 and 5000 then raise exception 'A subject and message are required';end if;
 select id into notice_id from public.student_notifications where delivery_key=request_id;
 if found then return notice_id;end if;
 select * into strict app from public.student_applications where id=app_id for update;
 if not exists(select 1 from public.student_documents where application_id=app.id and status<>'replaced') or exists(select 1 from public.student_documents where application_id=app.id and status<>'replaced' and (status<>'verified' or scan_status<>'clean')) then raise exception 'Approve and scan all current documents before issuing a letter';end if;
 if exists(select 1 from unnest(coalesce((select required_document_categories from public.trinity_configuration where id=true),array['nic_front','passport','cv'])) as required(category) where not exists(select 1 from public.student_documents d where d.application_id=app.id and d.category=required.category and d.status='verified' and d.scan_status='clean')) then raise exception 'Required documents are still missing or not approved';end if;
 select * into letter from public.approval_letters where application_id=app.id;
 if not found then
  if pdf_path is null or split_part(pdf_path,'/',1)<>app.student_id::text or split_part(pdf_path,'/',2)<>app.id::text or not exists(select 1 from storage.objects o where o.bucket_id='student-private-letters' and o.name=pdf_path and o.metadata->>'mimetype'='application/pdf') then raise exception 'Upload the approval PDF before sending';end if;
  insert into public.approval_letters(application_id,student_id,reference_number,storage_path,approved_by)
  values(app.id,app.student_id,'TRI-DOC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),pdf_path,auth.uid()) returning * into letter;
 end if;
 insert into public.student_notifications(student_id,title,message,approval_letter_id,delivery_key)
 values(app.student_id,trim(subject),trim(body),letter.id,request_id) returning id into notice_id;
 return notice_id;
end $$;
revoke all on function public.portal_send_approval_letter(uuid,text,text,text,uuid) from public,anon;
grant execute on function public.portal_send_approval_letter(uuid,text,text,text,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
