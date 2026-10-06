-- Apply after document_automation.sql. Student-first workflow supersedes automatic signing.
begin;
alter table public.trinity_configuration add column if not exists required_document_categories text[] not null default array['nic_front','nic_back','passport','education'];
alter table public.trinity_configuration add column if not exists payment_instructions text not null default '';
alter table public.portal_profiles add column if not exists first_name text not null default '',add column if not exists last_name text not null default '',add column if not exists date_of_birth date,add column if not exists gender text not null default '',add column if not exists nic_number text not null default '',add column if not exists passport_number text not null default '',add column if not exists nationality text not null default '';
grant update(first_name,last_name,date_of_birth,gender,nic_number,passport_number,nationality) on public.portal_profiles to authenticated;
alter table public.student_applications add column if not exists intake text not null default '',add column if not exists institution text not null default '';
grant update(intake,institution) on public.student_applications to authenticated;
alter table public.student_documents drop constraint if exists student_documents_category_check;
alter table public.student_documents add constraint student_documents_category_check check(category in ('national_id','nic_front','nic_back','passport','photograph','education','transcript','english_qualification','cv','financial','other'));
alter table public.student_documents add column if not exists reviewed_by uuid references auth.users(id);
alter table public.document_extractions add column if not exists confidence jsonb not null default '{}',add column if not exists manual_review_required boolean not null default true,add column if not exists confirmed_fields jsonb;

create or replace function public.portal_confirm_extracted_details(document uuid,final_fields jsonb) returns void language plpgsql security definer set search_path=public as $$
declare d student_documents;
begin
 select * into strict d from student_documents where id=document and student_id=auth.uid() and scan_status='clean' and status not in ('replaced','rejected');
 if not exists(select 1 from document_extractions where document_id=document) then raise exception 'Read this document first';end if;
 if length(trim(coalesce(final_fields->>'full_name','')))=0 or length(trim(coalesce(final_fields->>'identification_number','')))=0 or length(final_fields::text)>6000 then raise exception 'Enter a name and identity number';end if;
 update document_extractions set confirmed_fields=final_fields,confirmed_at=now() where document_id=document;
 update portal_profiles set full_name=trim(final_fields->>'full_name'),identification_number=trim(final_fields->>'identification_number'),
 nic_number=case when d.category in ('national_id','nic_front','nic_back') then trim(final_fields->>'identification_number') else nic_number end,
 passport_number=case when d.category='passport' then trim(final_fields->>'identification_number') else passport_number end,
 residential_address=coalesce(nullif(trim(final_fields->>'residential_address'),''),residential_address),
 date_of_birth=coalesce(nullif(final_fields->>'date_of_birth','')::date,date_of_birth),nationality=coalesce(nullif(trim(final_fields->>'nationality'),''),nationality) where id=auth.uid();
end $$;
revoke all on function public.portal_confirm_extracted_details(uuid,jsonb) from public,anon;
grant execute on function public.portal_confirm_extracted_details(uuid,jsonb) to authenticated;
drop function if exists public.portal_confirm_extracted_details(uuid,text,text,text);

create table public.application_notes(id uuid primary key default gen_random_uuid(),application_id uuid not null references student_applications(id),author_id uuid not null default auth.uid() references auth.users(id),note text not null check(length(note) between 1 and 5000),created_at timestamptz not null default now());
alter table public.application_notes enable row level security;
create policy "Staff read notes" on application_notes for select to authenticated using(portal_is_case_worker());
create policy "Staff create notes" on application_notes for insert to authenticated with check(portal_is_case_worker() and author_id=auth.uid());
grant select,insert on application_notes to authenticated;
create or replace function public.portal_application_ready(app_id uuid) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from student_applications a join portal_profiles p on p.id=a.student_id where a.id=app_id
 and nullif(trim(p.full_name),'') is not null and nullif(trim(p.nic_number),'') is not null and nullif(trim(p.passport_number),'') is not null
 and p.date_of_birth is not null and nullif(trim(p.residential_address),'') is not null and nullif(trim(p.phone),'') is not null and nullif(trim(a.intake),'') is not null
 and not exists(select 1 from unnest((select required_document_categories from trinity_configuration where id=true)) c where not exists(select 1 from student_documents d where d.application_id=a.id and d.category=c and d.status='verified' and d.scan_status='clean'))
 and not exists(select 1 from student_documents d where d.application_id=a.id and d.status<>'replaced' and (d.status<>'verified' or d.scan_status<>'clean'))
 and exists(select 1 from document_extractions e join student_documents d on d.id=e.document_id where d.application_id=a.id and d.category in ('nic_front','national_id') and d.status='verified' and e.confirmed_fields is not null))
$$;
revoke all on function public.portal_application_ready(uuid) from public,anon,authenticated;
grant execute on function public.portal_application_ready(uuid) to service_role;
create or replace function public.portal_guard_application() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status is distinct from old.status and auth.uid() is not null then
  if new.status='documents_verified' and (old.status<>'under_board_review' or not portal_is_case_worker() or not portal_application_ready(old.id)) then raise exception 'Complete the profile, confirm NIC extraction and approve mandatory documents first';end if;
  if new.status in ('application_approved','application_rejected') and (old.status<>'documents_verified' or not portal_can_approve()) then raise exception 'Authorized approval is required after document verification';end if;
  if new.status not in ('documents_uploaded','under_board_review','documents_verified','application_approved','application_rejected') then raise exception 'This stage is controlled by the server';end if;
  if new.status='documents_uploaded' and old.status<>'application_submitted' then raise exception 'Cannot reset workflow';end if;
 end if;
 return new;
end $$;
create trigger portal_application_guard before update on student_applications for each row execute function portal_guard_application();
create or replace function public.portal_invalidate_profile_review() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if (to_jsonb(new)-array['role','updated_at']) is distinct from (to_jsonb(old)-array['role','updated_at']) then
 update student_applications set status='under_board_review' where student_id=new.id and status in ('documents_verified','application_approved');end if;return new;
end $$;
create trigger portal_profile_review_reset after update on portal_profiles for each row execute function portal_invalidate_profile_review();
create or replace function public.portal_guard_document() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  if new.student_id is distinct from (select student_id from student_applications where id=new.application_id) or new.storage_path not like new.student_id::text||'/'||new.application_id::text||'/%' then raise exception 'Document ownership mismatch';end if;
  if new.mime_type not in ('application/pdf','image/jpeg','image/png') then raise exception 'Unsupported file type';end if;
  if auth.uid() is not null and (new.status<>'pending' or new.scan_status<>'pending' or new.reviewed_at is not null or new.reviewed_by is not null) then raise exception 'Cannot pre-approve an upload';end if;
  update student_applications set status='under_board_review' where id=new.application_id and status in ('documents_verified','application_approved');
 else
  if new.storage_path<>old.storage_path or new.student_id<>old.student_id or new.application_id<>old.application_id or new.mime_type<>old.mime_type or new.size_bytes<>old.size_bytes then raise exception 'Upload a new document instead of changing the stored file';end if;
  if auth.uid() is not null and new.scan_status<>old.scan_status then raise exception 'Only the scanner can record scan results';end if;
  if new.status<>old.status and new.status in ('verified','rejected','correction_requested') and auth.uid() is not null then
   if not portal_is_case_worker() or old.scan_status<>'clean' then raise exception 'Reviewer and clean scan required';end if;
   if new.status in ('rejected','correction_requested') and nullif(trim(new.reviewer_comment),'') is null then raise exception 'Give a reason';end if;
   new.reviewed_by:=auth.uid();new.reviewed_at:=now();
  end if;
 end if;return new;
end $$;
create trigger portal_document_guard before insert or update on student_documents for each row execute function portal_guard_document();
drop policy if exists "Students replace own rejected file" on storage.objects;
create policy "Remove unregistered uploads only" on storage.objects for delete to authenticated using(bucket_id='student-private-documents' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.student_documents d where d.storage_path=name));

alter table public.student_agreements add column workflow_version integer not null default 1,add column template_snapshot jsonb not null default '{}',add column student_snapshot jsonb not null default '{}',add column document_sha256 text,add column correction_reason text,add column student_signed_pdf_path text;
create table public.agreement_versions(id uuid primary key default gen_random_uuid(),agreement_id uuid not null references student_agreements(id),stage text not null,pdf_path text not null unique,sha256 text not null,actor_id uuid references auth.users(id),created_at timestamptz not null default now(),unique(agreement_id,stage));
create table public.agreement_signatures(id uuid primary key default gen_random_uuid(),agreement_id uuid not null references student_agreements(id),signer_id uuid not null references auth.users(id),signer_role text not null check(signer_role in ('student','management')),method text not null check(method in ('drawn','uploaded')),input_hash text not null,output_hash text not null,consent_text text not null,security_metadata jsonb not null default '{}',created_at timestamptz not null default now(),unique(agreement_id,signer_role));
alter table public.agreement_versions enable row level security;
alter table public.agreement_signatures enable row level security;
create policy "Read own agreement versions" on agreement_versions for select to authenticated using(portal_is_case_worker() or exists(select 1 from student_agreements a where a.id=agreement_id and a.student_id=auth.uid()));
create policy "Staff read signature evidence" on agreement_signatures for select to authenticated using(portal_is_case_worker());
grant select on agreement_versions,agreement_signatures to authenticated;
drop policy if exists "Agreements self or staff read" on student_agreements;
create policy "Agreements self or staff read" on student_agreements for select to authenticated using(student_id=auth.uid() or portal_is_case_worker());
drop policy if exists "Students or staff read private agreements" on storage.objects;
create policy "Students or staff read private agreements" on storage.objects for select to authenticated using(bucket_id='student-private-agreements' and (public.portal_is_case_worker() or exists(select 1 from public.agreement_versions v join public.student_agreements a on a.id=v.agreement_id where a.student_id=auth.uid() and v.pdf_path=storage.objects.name) or exists(select 1 from public.student_agreements a where a.student_id=auth.uid() and (a.completed_pdf_path=name or (a.head_signed_at is not null and a.private_pdf_path=name)))));
create sequence public.agreement_reference_seq;
create function public.portal_next_agreement_reference() returns text language sql security definer set search_path=public as $$ select 'TRI-AGR-'||to_char(now(),'YYYY')||'-'||lpad(nextval('agreement_reference_seq')::text,6,'0') $$;
revoke all on function portal_next_agreement_reference() from public,anon,authenticated;
grant execute on function portal_next_agreement_reference() to service_role;
create function public.portal_notify_staff(title text,message text) returns void language sql security definer set search_path=public as $$ insert into student_notifications(student_id,title,message) select id,portal_notify_staff.title,portal_notify_staff.message from portal_profiles where role in ('admin','head','delegate','signatory') $$;
revoke all on function portal_notify_staff(text,text) from public,anon,authenticated;
grant execute on function portal_notify_staff(text,text) to service_role;
drop function if exists public.portal_register_generated_agreement(uuid,uuid,text,text,timestamptz,text,uuid);
create function public.portal_register_generated_agreement(app_id uuid,template uuid,reference text,pdf_path text,document_hash text,actor uuid,template_data jsonb,student_data jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;owner_id uuid;
begin
 perform 1 from student_applications where id=app_id for update;
 if not portal_application_ready(app_id) then raise exception 'Application review is incomplete';end if;
 if exists(select 1 from student_agreements where application_id=app_id and status<>'voided') then raise exception 'An active agreement already exists';end if;
 select student_id into strict owner_id from student_applications where id=app_id and status='application_approved';
 if not exists(select 1 from agreement_templates where id=template and active and approval_status='approved' and version=(template_data->>'version')::integer and body=template_data->>'body') then raise exception 'Template changed; generate again';end if;
 insert into student_agreements(application_id,student_id,template_id,reference_number,status,private_pdf_path,workflow_version,template_snapshot,student_snapshot,document_sha256) values(app_id,owner_id,template,reference,'awaiting_student_signature',pdf_path,2,template_data,student_data,document_hash) returning id into result_id;
 insert into agreement_versions(agreement_id,stage,pdf_path,sha256,actor_id) values(result_id,'generated',pdf_path,document_hash,actor);
 insert into student_notifications(student_id,title,message) values(owner_id,'Agreement ready for signature','Your Trinity International agreement is ready. Please review the complete agreement before signing.');return result_id;
end $$;
revoke all on function portal_register_generated_agreement(uuid,uuid,text,text,text,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function portal_register_generated_agreement(uuid,uuid,text,text,text,uuid,jsonb,jsonb) to service_role;

create function public.portal_submit_signature(agreement uuid,actor uuid,signature_method text,input_hash text,output_hash text,pdf_path text,metadata jsonb) returns text language plpgsql security definer set search_path=public as $$
declare a student_agreements;r text;next_status text;sign_role text;
begin
 select * into strict a from student_agreements where id=agreement for update;select role into strict r from portal_profiles where id=actor;
 if a.workflow_version<>2 or a.document_sha256<>input_hash then raise exception 'Agreement changed; reload before signing';end if;
 if a.status='awaiting_student_signature' and a.student_id=actor and r='student' then next_status:='awaiting_head_signature';sign_role:='student';
 elsif a.status='awaiting_head_signature' and a.student_signed_at is not null and actor<>a.student_id and r in ('head','delegate','signatory') then next_status:='completed';sign_role:='management';
 else raise exception 'You cannot sign this agreement at its current stage';end if;
 insert into agreement_signatures(agreement_id,signer_id,signer_role,method,input_hash,output_hash,consent_text,security_metadata) values(a.id,actor,sign_role,signature_method,input_hash,output_hash,'I confirm that I have reviewed the agreement and intend to apply this signature to this agreement.',metadata);
 insert into agreement_versions(agreement_id,stage,pdf_path,sha256,actor_id) values(a.id,sign_role||'_signed',pdf_path,output_hash,actor);
 update student_agreements set status=next_status,document_sha256=output_hash,student_signed_at=case when sign_role='student' then now() else student_signed_at end,student_signed_pdf_path=case when sign_role='student' then pdf_path else student_signed_pdf_path end,head_signed_at=case when sign_role='management' then now() else head_signed_at end,completed_pdf_path=case when sign_role='management' then pdf_path else completed_pdf_path end where id=a.id;
 insert into agreement_signing_audit(agreement_id,signer_id,signer_role,action,document_sha256) values(a.id,actor,sign_role,sign_role||'_signed',output_hash);
 insert into application_activity(application_id,actor_id,event_type,details) values(a.application_id,actor,next_status,jsonb_build_object('agreement_id',a.id,'sha256',output_hash));
 if next_status='completed' then insert into student_notifications(student_id,title,message) values(a.student_id,'Agreement completed — payments unlocked','Trinity has approved and signed your agreement. Download your completed PDF and open Payments.');
 else insert into student_notifications(student_id,title,message) values(a.student_id,'Signature submitted','Your signed agreement is awaiting Trinity approval. Payments remain locked.');perform portal_notify_staff('Agreement awaiting management approval','Review agreement '||a.reference_number||' in Agreement signing.');end if;return next_status;
end $$;
revoke all on function portal_submit_signature(uuid,uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function portal_submit_signature(uuid,uuid,text,text,text,text,jsonb) to service_role;
create function public.portal_request_agreement_correction(agreement uuid,reason text) returns void language plpgsql security definer set search_path=public as $$
declare a student_agreements;
begin
 if not exists(select 1 from portal_profiles where id=auth.uid() and role in ('head','delegate','signatory')) then raise exception 'Authorized signatory required';end if;
 if length(trim(reason)) not between 5 and 2000 then raise exception 'Enter a reason of 5 to 2000 characters';end if;
 select * into strict a from student_agreements where id=agreement and status='awaiting_head_signature' and workflow_version=2 for update;
 update student_agreements set status='voided',correction_reason=reason where id=a.id;
 insert into application_activity(application_id,actor_id,event_type,details) values(a.application_id,auth.uid(),'agreement_correction_requested',jsonb_build_object('agreement_id',a.id,'reason',reason));
 insert into student_notifications(student_id,title,message) values(a.student_id,'Agreement correction requested',reason);perform portal_notify_staff('Agreement requires a new version',a.reference_number||': '||reason);
end $$;
revoke all on function portal_request_agreement_correction(uuid,text) from public,anon;
grant execute on function portal_request_agreement_correction(uuid,text) to authenticated;
create or replace function public.portal_payment_unlocked(app_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from student_agreements where application_id=app_id and student_id=auth.uid() and status='completed' and student_signed_at is not null and head_signed_at is not null and completed_pdf_path is not null) $$;
create table public.portal_rate_limits(actor uuid not null,action text not null,window_start timestamptz not null,attempts integer not null,primary key(actor,action,window_start));
alter table portal_rate_limits enable row level security;
create function public.portal_consume_limit(actor uuid,action text,maximum integer) returns boolean language plpgsql security definer set search_path=public as $$
declare total integer;
begin insert into portal_rate_limits values(actor,action,date_trunc('hour',now()),1) on conflict on constraint portal_rate_limits_pkey do update set attempts=portal_rate_limits.attempts+1 returning attempts into total;return total<=maximum;end $$;
revoke all on function portal_consume_limit(uuid,text,integer) from public,anon,authenticated;
grant execute on function portal_consume_limit(uuid,text,integer) to service_role;
commit;
