begin;
alter table public.student_agreements add column if not exists is_sample boolean not null default false;
create or replace function public.portal_register_sample_agreement(app_id uuid,actor uuid,reference text,pdf_path text,document_hash text)
returns uuid language plpgsql security definer set search_path=public as $$
declare app public.student_applications; result_id uuid;
begin
 select * into strict app from public.student_applications where id=app_id and student_id=actor for update;
 if not exists(select 1 from public.portal_profiles where id=actor and role='student') or not exists(select 1 from public.approval_letters where application_id=app.id) then raise exception 'Student approval letter required';end if;
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
create or replace function public.portal_payment_unlocked(app_id uuid) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.student_agreements where application_id=app_id and student_id=auth.uid() and not is_sample and status='completed' and student_signed_at is not null and head_signed_at is not null and completed_pdf_path is not null)
$$;
create or replace function public.portal_register_generated_agreement(app_id uuid,template uuid,reference text,pdf_path text,document_hash text,actor uuid,template_data jsonb,student_data jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;owner_id uuid;
begin
 perform 1 from student_applications where id=app_id for update;
 if not portal_application_ready(app_id) then raise exception 'Application review is incomplete';end if;
 if exists(select 1 from student_agreements where application_id=app_id and not is_sample and status<>'voided') then raise exception 'An active agreement already exists';end if;
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
 if a.is_sample then insert into student_notifications(student_id,title,message,agreement_id) values(a.student_id,'Sample agreement submitted','Your signed SAMPLE agreement has been saved for workflow testing. No payment is due.',a.id);perform portal_notify_staff('Sample agreement for review','Review the signed sample agreement '||a.reference_number||' in Agreements.');
 elsif next_status='completed' then insert into student_notifications(student_id,title,message) values(a.student_id,'Agreement completed — payments unlocked','Trinity has approved and signed your agreement. Download your completed PDF and open Payments.');
 else insert into student_notifications(student_id,title,message) values(a.student_id,'Signature submitted','Your signed agreement is awaiting Trinity approval. Payments remain locked.');perform portal_notify_staff('Agreement awaiting management approval','Review agreement '||a.reference_number||' in Agreement signing.');end if;return next_status;
end $$;
revoke all on function portal_submit_signature(uuid,uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function portal_submit_signature(uuid,uuid,text,text,text,text,jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
