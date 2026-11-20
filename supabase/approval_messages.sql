begin;
grant select on public.student_notifications to service_role;
alter table public.student_notifications add column if not exists approved_application_id uuid references public.student_applications(id);
create table if not exists public.portal_email_outbox(id uuid primary key default gen_random_uuid(),notification_id uuid not null unique references public.student_notifications(id),status text not null default 'pending',attempts integer not null default 0,last_attempt_at timestamptz,created_at timestamptz not null default now());
alter table public.portal_email_outbox enable row level security;
grant select,insert,update on public.portal_email_outbox to service_role;
create or replace function public.portal_queue_approval_email() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if new.approved_application_id is not null then insert into public.portal_email_outbox(notification_id) values(new.id) on conflict(notification_id) do nothing;end if;return new;end $$;
drop trigger if exists portal_approval_email_queue on public.student_notifications;
create trigger portal_approval_email_queue after insert on public.student_notifications for each row execute function public.portal_queue_approval_email();
create or replace function public.portal_send_approval_message(app_id uuid,subject text,body text,request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare app public.student_applications;notice_id uuid;
begin
 if not public.portal_can_approve() then raise exception 'Authorized approval officer required';end if;
 if request_id is null or length(trim(coalesce(subject,''))) not between 1 and 180 or length(trim(coalesce(body,''))) not between 1 and 5000 then raise exception 'A subject and message are required';end if;
 select * into strict app from public.student_applications where id=app_id for update;
 select id into notice_id from public.student_notifications where delivery_key=request_id and approved_application_id=app.id;
 if found then return notice_id;end if;
 if not exists(select 1 from public.student_documents where application_id=app.id and status<>'replaced') or exists(select 1 from public.student_documents where application_id=app.id and status<>'replaced' and (status<>'verified' or scan_status<>'clean')) then raise exception 'Approve and scan all current documents before sending approval';end if;
 if exists(select 1 from unnest(coalesce((select required_document_categories from public.trinity_configuration where id=true),array['nic_front','passport','cv'])) as required(category) where not exists(select 1 from public.student_documents d where d.application_id=app.id and d.category=required.category and d.status='verified' and d.scan_status='clean')) then raise exception 'Required documents are still missing or not approved';end if;

 insert into public.student_notifications(student_id,title,message,approved_application_id,delivery_key) values(app.student_id,trim(subject),trim(body),app.id,request_id) returning id into notice_id;
 update public.student_applications set status='documents_verified',updated_at=now() where id=app.id and status in ('application_submitted','documents_uploaded','under_board_review');
 return notice_id;
end $$;
revoke all on function public.portal_send_approval_message(uuid,text,text,uuid) from public,anon;
grant execute on function public.portal_send_approval_message(uuid,text,text,uuid) to authenticated;
create or replace function public.portal_register_sample_agreement(app_id uuid,actor uuid,reference text,pdf_path text,document_hash text)
returns uuid language plpgsql security definer set search_path=public as $$
declare app public.student_applications; result_id uuid;
begin
 select * into strict app from public.student_applications where id=app_id and student_id=actor for update;
 if not exists(select 1 from public.portal_profiles where id=actor and role='student') or (not exists(select 1 from public.approval_letters where application_id=app.id) and not exists(select 1 from public.student_notifications where approved_application_id=app.id and student_id=actor)) then raise exception 'Student approval message required';end if;
 if not exists(select 1 from public.student_documents where application_id=app.id and status<>'replaced') or exists(select 1 from public.student_documents where application_id=app.id and status<>'replaced' and (status<>'verified' or scan_status<>'clean')) then raise exception 'Document review is incomplete';end if;
 select id into result_id from public.student_agreements where application_id=app.id and is_sample and status<>'voided';
 if found then return result_id;end if;
 insert into public.student_agreements(application_id,student_id,reference_number,status,private_pdf_path,workflow_version,is_sample,document_sha256,student_snapshot,template_snapshot)
 values(app.id,actor,reference,'awaiting_student_signature',pdf_path,2,true,document_hash,jsonb_build_object('application',app),'{"name":"Sample workflow agreement","sample_only":true}') returning id into result_id;
 insert into public.agreement_versions(agreement_id,stage,pdf_path,sha256,actor_id) values(result_id,'generated',pdf_path,document_hash,actor);
 return result_id;
end $$;
revoke all on function public.portal_register_sample_agreement(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.portal_register_sample_agreement(uuid,uuid,text,text,text) to service_role;

notify pgrst,'reload schema';commit;