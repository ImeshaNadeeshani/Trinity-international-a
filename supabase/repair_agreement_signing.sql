-- Agreement generation and signing foundation; does not approve templates or applications.
begin;
alter table public.student_notifications add column if not exists agreement_id uuid references public.student_agreements(id) on delete set null;
alter table public.portal_profiles add column if not exists first_name text not null default '',add column if not exists last_name text not null default '',add column if not exists date_of_birth date,add column if not exists gender text not null default '',add column if not exists nic_number text not null default '',add column if not exists passport_number text not null default '',add column if not exists nationality text not null default '';
grant update(first_name,last_name,date_of_birth,gender,nic_number,passport_number,nationality) on public.portal_profiles to authenticated;
alter table public.trinity_configuration add column if not exists required_document_categories text[] not null default array['nic_front','passport','cv'];
alter table public.trinity_configuration add column if not exists payment_instructions text not null default '';
create table if not exists public.document_extractions(document_id uuid primary key references public.student_documents(id) on delete cascade,student_id uuid not null references auth.users(id),fields jsonb not null default '{}',confirmed_at timestamptz,created_at timestamptz not null default now());
alter table public.document_extractions add column if not exists confidence jsonb not null default '{}',add column if not exists manual_review_required boolean not null default true,add column if not exists confirmed_fields jsonb;
alter table public.document_extractions enable row level security;
drop policy if exists "Read own extracted details" on public.document_extractions;
create policy "Read own extracted details" on public.document_extractions for select to authenticated using(student_id=auth.uid() or public.portal_is_case_worker());
grant select on public.document_extractions to authenticated;
create or replace function public.portal_application_ready(app_id uuid) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from student_applications a join portal_profiles p on p.id=a.student_id where a.id=app_id
 and nullif(trim(p.full_name),'') is not null and nullif(trim(p.nic_number),'') is not null and nullif(trim(p.passport_number),'') is not null
 and p.date_of_birth is not null and nullif(trim(p.residential_address),'') is not null and nullif(trim(p.phone),'') is not null and nullif(trim(a.intake),'') is not null
 and not exists(select 1 from unnest((select required_document_categories from trinity_configuration where id=true)) c where not exists(select 1 from student_documents d where d.application_id=a.id and d.category=c and d.status='verified' and d.scan_status='clean'))
 and not exists(select 1 from student_documents d where d.application_id=a.id and d.status<>'replaced' and (d.status<>'verified' or d.scan_status<>'clean'))
 and exists(select 1 from student_documents d where d.application_id=a.id and d.category in ('nic_front','national_id') and d.status='verified' and d.scan_status='clean'))
$$;
revoke all on function public.portal_application_ready(uuid) from public,anon,authenticated;
grant execute on function public.portal_application_ready(uuid) to service_role;
alter table public.student_agreements add column if not exists workflow_version integer not null default 1,add column if not exists template_snapshot jsonb not null default '{}',add column if not exists student_snapshot jsonb not null default '{}',add column if not exists document_sha256 text,add column if not exists correction_reason text,add column if not exists student_signed_pdf_path text;
create table if not exists public.agreement_versions(id uuid primary key default gen_random_uuid(),agreement_id uuid not null references student_agreements(id),stage text not null,pdf_path text not null unique,sha256 text not null,actor_id uuid references auth.users(id),created_at timestamptz not null default now(),unique(agreement_id,stage));
create table if not exists public.agreement_signatures(id uuid primary key default gen_random_uuid(),agreement_id uuid not null references student_agreements(id),signer_id uuid not null references auth.users(id),signer_role text not null check(signer_role in ('student','management')),method text not null check(method in ('drawn','uploaded')),input_hash text not null,output_hash text not null,consent_text text not null,security_metadata jsonb not null default '{}',created_at timestamptz not null default now(),unique(agreement_id,signer_role));
alter table public.agreement_versions enable row level security;
alter table public.agreement_signatures enable row level security;
drop policy if exists "Read own agreement versions" on agreement_versions;
create policy "Read own agreement versions" on agreement_versions for select to authenticated using(portal_is_case_worker() or exists(select 1 from student_agreements a where a.id=agreement_id and a.student_id=auth.uid()));
drop policy if exists "Staff read signature evidence" on agreement_signatures;
create policy "Staff read signature evidence" on agreement_signatures for select to authenticated using(portal_is_case_worker());
grant select on agreement_versions,agreement_signatures to authenticated;
drop policy if exists "Agreements self or staff read" on student_agreements;
drop policy if exists "Agreements self or staff read" on student_agreements;
create policy "Agreements self or staff read" on student_agreements for select to authenticated using(student_id=auth.uid() or portal_is_case_worker());
drop policy if exists "Students or staff read private agreements" on storage.objects;
drop policy if exists "Students or staff read private agreements" on storage.objects;
create policy "Students or staff read private agreements" on storage.objects for select to authenticated using(bucket_id='student-private-agreements' and (public.portal_is_case_worker() or exists(select 1 from public.agreement_versions v join public.student_agreements a on a.id=v.agreement_id where a.student_id=auth.uid() and v.pdf_path=storage.objects.name) or exists(select 1 from public.student_agreements a where a.student_id=auth.uid() and (a.completed_pdf_path=name or (a.head_signed_at is not null and a.private_pdf_path=name)))));
create sequence if not exists public.agreement_reference_seq;
create or replace function public.portal_next_agreement_reference() returns text language sql security definer set search_path=public as $$ select 'TRI-AGR-'||to_char(now(),'YYYY')||'-'||lpad(nextval('agreement_reference_seq')::text,6,'0') $$;
revoke all on function portal_next_agreement_reference() from public,anon,authenticated;
grant execute on function portal_next_agreement_reference() to service_role;
create or replace function public.portal_notify_staff(title text,message text) returns void language sql security definer set search_path=public as $$ insert into student_notifications(student_id,title,message) select id,portal_notify_staff.title,portal_notify_staff.message from portal_profiles where role in ('admin','head','delegate','signatory') $$;
revoke all on function portal_notify_staff(text,text) from public,anon,authenticated;
grant execute on function portal_notify_staff(text,text) to service_role;
drop function if exists public.portal_register_generated_agreement(uuid,uuid,text,text,timestamptz,text,uuid);
create or replace function public.portal_register_generated_agreement(app_id uuid,template uuid,reference text,pdf_path text,document_hash text,actor uuid,template_data jsonb,student_data jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;owner_id uuid;
begin
 perform 1 from student_applications where id=app_id for update;
 if not portal_application_ready(app_id) then raise exception 'Application review is incomplete';end if;
 if exists(select 1 from student_agreements where application_id=app_id and status<>'voided') then raise exception 'An active agreement already exists';end if;
 select student_id into strict owner_id from student_applications where id=app_id and status='application_approved';
 if not exists(select 1 from agreement_templates where id=template and active and approval_status='approved' and version=(template_data->>'version')::integer and body=template_data->>'body') then raise exception 'Template changed; generate again';end if;
 insert into student_agreements(application_id,student_id,template_id,reference_number,status,private_pdf_path,workflow_version,template_snapshot,student_snapshot,document_sha256) values(app_id,owner_id,template,reference,'awaiting_student_signature',pdf_path,2,template_data,student_data,document_hash) returning id into result_id;
 insert into agreement_versions(agreement_id,stage,pdf_path,sha256,actor_id) values(result_id,'generated',pdf_path,document_hash,actor);
 insert into student_notifications(student_id,title,message,agreement_id) values(owner_id,'Documents approved - agreement ready for signature','Trinity management approved your documents. Your Student Service Agreement is ready. Open the agreement below, review its terms, add your digital signature and submit it to management.',result_id);return result_id;
end $$;
revoke all on function portal_register_generated_agreement(uuid,uuid,text,text,text,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function portal_register_generated_agreement(uuid,uuid,text,text,text,uuid,jsonb,jsonb) to service_role;

create or replace function public.portal_submit_signature(agreement uuid,actor uuid,signature_method text,input_hash text,output_hash text,pdf_path text,metadata jsonb) returns text language plpgsql security definer set search_path=public as $$
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
create or replace function public.portal_request_agreement_correction(agreement uuid,reason text) returns void language plpgsql security definer set search_path=public as $$
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

grant select on public.student_applications,public.student_agreements,public.agreement_templates,public.student_payment_schedules,public.payment_installments,public.portal_profiles,public.trinity_configuration,public.student_documents,public.authorized_approval_officers,public.document_extractions to service_role;
grant select,insert,update on public.agreement_versions,public.agreement_signatures,public.student_agreements to service_role;
grant insert on public.application_activity,public.agreement_signing_audit,public.student_notifications to service_role;
grant usage,select on all sequences in schema public to service_role;
create or replace function public.portal_save_payment_schedule(app_id uuid,values_json jsonb,installments_json jsonb) returns void language plpgsql security definer set search_path=public as $$
declare sid uuid;owner_id uuid;total numeric;initial numeric;remaining numeric;
begin
 if not portal_is_admin() then raise exception 'Administrator required';end if;
 select student_id into strict owner_id from student_applications where id=app_id for update;
 total:=(values_json->>'total_fee')::numeric;initial:=(values_json->>'initial_payment')::numeric;remaining:=(values_json->>'balance')::numeric;
 if total<>initial+remaining or coalesce((select sum((i->>'amount')::numeric) from jsonb_array_elements(installments_json) i),0)<>remaining then raise exception 'Initial payment plus installments must equal the total fee';end if;
 insert into student_payment_schedules(application_id,student_id,currency,total_fee,initial_payment,balance,included_services,excluded_expenses,payment_methods,created_by)
 values(app_id,owner_id,values_json->>'currency',total,initial,remaining,array(select jsonb_array_elements_text(values_json->'included_services')),array(select jsonb_array_elements_text(values_json->'excluded_expenses')),array(select jsonb_array_elements_text(values_json->'payment_methods')),auth.uid())
 on conflict(application_id) do update set currency=excluded.currency,total_fee=excluded.total_fee,initial_payment=excluded.initial_payment,balance=excluded.balance,included_services=excluded.included_services,excluded_expenses=excluded.excluded_expenses,payment_methods=excluded.payment_methods returning id into sid;
 delete from payment_installments where schedule_id=sid;
 insert into payment_installments(schedule_id,label,amount,due_at) select sid,i->>'label',(i->>'amount')::numeric,(i->>'due_at')::date from jsonb_array_elements(installments_json) i;
end $$;
revoke all on function portal_save_payment_schedule(uuid,jsonb,jsonb) from public,anon;
grant execute on function portal_save_payment_schedule(uuid,jsonb,jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
