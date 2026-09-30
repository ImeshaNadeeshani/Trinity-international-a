-- Apply after student_portal.sql.
-- Management-controlled configuration, fee schedules and approval letters.

alter table public.portal_profiles drop constraint if exists portal_profiles_role_check;
alter table public.portal_profiles add constraint portal_profiles_role_check
  check (role in ('student','board','admin','head','delegate','signatory','legal_reviewer'));
alter table public.portal_profiles add column if not exists residential_address text not null default '';
alter table public.portal_profiles add column if not exists identification_number text not null default '';
grant update (full_name,phone,residential_address,identification_number) on public.portal_profiles to authenticated;
drop policy if exists "Admins manage portal roles" on public.portal_profiles;
create policy "Admins manage portal roles" on public.portal_profiles for update to authenticated using(public.portal_is_admin()) with check(public.portal_is_admin());
grant update(role) on public.portal_profiles to authenticated;

alter table public.agreement_templates add column if not exists approval_status text not null default 'draft'
  check (approval_status in ('draft','pending_legal_review','approved','rejected'));
alter table public.agreement_templates add column if not exists approved_by uuid references auth.users(id);
alter table public.agreement_templates add column if not exists approved_at timestamptz;
alter table public.agreement_templates add column if not exists legal_review_note text;
update public.agreement_templates set approval_status='draft',active=false,approved_by=null
where approved_at is null;
update public.agreement_templates set active=false where approval_status<>'approved';

create table if not exists public.trinity_configuration (
  id boolean primary key default true check(id),
  registered_business_name text not null default 'Pending management confirmation',
  registration_number text not null default 'Pending management confirmation',
  registered_address text not null default 'Pending management confirmation',
  official_email text not null default 'Pending management confirmation',
  approval_officer_name text not null default 'Pending management confirmation',
  approval_officer_designation text not null default 'Pending management confirmation',
  approval_permissions text[] not null default array[]::text[],
  payment_currency text not null default 'LKR',
  payment_methods text[] not null default array[]::text[],
  refund_policy_status text not null default 'pending_management_and_legal_approval'
    check(refund_policy_status in ('pending_management_and_legal_approval','pending_legal_approval','approved')),
  refund_policy jsonb not null default '{"percentages":null,"deductions":null,"cancellation_deadlines":null}'::jsonb,
  refund_management_approved_by uuid references auth.users(id),
  refund_management_approved_at timestamptz,
  refund_legal_approved_by uuid references auth.users(id),
  refund_legal_approved_at timestamptz,
  signature_provider text not null default 'unconfigured',
  email_provider text not null default 'unconfigured',
  document_scanner_provider text not null default 'unconfigured',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.trinity_configuration(id) values(true) on conflict(id) do nothing;
alter table public.trinity_configuration enable row level security;
drop policy if exists "Admin manage Trinity configuration" on public.trinity_configuration;
create policy "Staff read Trinity configuration" on public.trinity_configuration for select to authenticated using(public.portal_is_staff());
create policy "Admin manage Trinity configuration" on public.trinity_configuration for all to authenticated
  using(public.portal_is_admin()) with check(public.portal_is_admin());
grant select,insert,update on public.trinity_configuration to authenticated;
create or replace function public.portal_protect_refund_policy()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if new.refund_policy is distinct from old.refund_policy then
    new.refund_policy_status:='pending_management_and_legal_approval';
    new.refund_management_approved_by:=null;new.refund_management_approved_at:=null;
    new.refund_legal_approved_by:=null;new.refund_legal_approved_at:=null;
  end if;
  if new.refund_policy_status='approved' and (not public.portal_is_legal_reviewer() or old.refund_management_approved_at is null or old.refund_management_approved_by=auth.uid()) then
    raise exception 'Refund rules require recorded management approval and a separate legal reviewer approval';
  end if;
  return new;
end $$;
drop trigger if exists portal_refund_approval_guard on public.trinity_configuration;
create trigger portal_refund_approval_guard before update on public.trinity_configuration for each row execute function public.portal_protect_refund_policy();
create or replace function public.portal_management_approve_refund_policy()
returns void language plpgsql security definer set search_path=public
as $$ begin
  if not public.portal_is_admin() then raise exception 'Administrator access required'; end if;
  update public.trinity_configuration set refund_policy_status='pending_legal_approval',refund_management_approved_by=auth.uid(),refund_management_approved_at=now(),refund_legal_approved_by=null,refund_legal_approved_at=null where id=true;
end $$;
create or replace function public.portal_legal_approve_refund_policy()
returns void language plpgsql security definer set search_path=public
as $$ begin
  if not public.portal_is_legal_reviewer() then raise exception 'Legal reviewer access required'; end if;
  update public.trinity_configuration set refund_policy_status='approved',refund_legal_approved_by=auth.uid(),refund_legal_approved_at=now()
  where id=true and refund_management_approved_at is not null and refund_management_approved_by<>auth.uid() and refund_policy_status='pending_legal_approval'
    and jsonb_typeof(refund_policy)='object'
    and refund_policy ? 'percentages' and refund_policy->'percentages'<>'null'::jsonb
    and refund_policy ? 'deductions' and refund_policy->'deductions'<>'null'::jsonb
    and refund_policy ? 'cancellation_deadlines' and refund_policy->'cancellation_deadlines'<>'null'::jsonb;
  if not found then raise exception 'Management approval is required before legal approval'; end if;
end $$;
grant execute on function public.portal_management_approve_refund_policy() to authenticated;
grant execute on function public.portal_legal_approve_refund_policy() to authenticated;
revoke all on function public.portal_management_approve_refund_policy() from public,anon;
revoke all on function public.portal_legal_approve_refund_policy() from public,anon;

create table if not exists public.portal_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);
alter table public.portal_audit_log enable row level security;
drop policy if exists "Staff read portal audit log" on public.portal_audit_log;
create policy "Administrators read portal audit log" on public.portal_audit_log for select to authenticated using(public.portal_is_admin());
grant select on public.portal_audit_log to authenticated;
create or replace function public.portal_write_audit_log()
returns trigger language plpgsql security definer set search_path=public
as $$ declare old_json jsonb;new_json jsonb;entity_key text;verb text;begin
  if tg_op<>'INSERT' then old_json:=to_jsonb(old);end if;
  if tg_op<>'DELETE' then new_json:=to_jsonb(new);end if;
  entity_key:=coalesce(new_json->>'id',old_json->>'id',new_json->>'user_id',old_json->>'user_id','unknown');
  verb:=lower(tg_op);
  insert into public.portal_audit_log(actor_id,entity_type,entity_id,action,before_value,after_value)
  values(auth.uid(),tg_table_name,entity_key,verb,old_json,new_json);
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists portal_audit_profiles on public.portal_profiles;
create trigger portal_audit_profiles after update of role on public.portal_profiles for each row execute function public.portal_write_audit_log();
drop trigger if exists portal_audit_configuration on public.trinity_configuration;
create trigger portal_audit_configuration after update on public.trinity_configuration for each row execute function public.portal_write_audit_log();
drop trigger if exists portal_audit_templates on public.agreement_templates;
create trigger portal_audit_templates after insert or update or delete on public.agreement_templates for each row execute function public.portal_write_audit_log();
drop trigger if exists portal_audit_agreements on public.student_agreements;
create trigger portal_audit_agreements after insert or update on public.student_agreements for each row execute function public.portal_write_audit_log();

create or replace function public.portal_log_application_status()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if old.status is distinct from new.status then
    new.updated_at:=now();
    insert into public.application_activity(application_id,actor_id,event_type,details)
    values(new.id,auth.uid(),'application_status_changed',jsonb_build_object('from',old.status,'to',new.status));
  end if;
  return new;
end $$;
drop trigger if exists portal_application_status_audit on public.student_applications;
create trigger portal_application_status_audit before update on public.student_applications for each row execute function public.portal_log_application_status();

create or replace function public.portal_log_document_change()
returns trigger language plpgsql security definer set search_path=public
as $$ declare action_name text;begin
  if tg_op='INSERT' then action_name:='document_uploaded';
  elsif old.scan_status is distinct from new.scan_status then action_name:='document_scan_'||new.scan_status;
  elsif old.status is distinct from new.status then action_name:='document_'||new.status;
  else return new;end if;
  insert into public.application_activity(application_id,actor_id,event_type,details)
  values(new.application_id,auth.uid(),action_name,jsonb_build_object('document_id',new.id));
  return new;
end $$;
drop trigger if exists portal_document_audit on public.student_documents;
create trigger portal_document_audit after insert or update on public.student_documents for each row execute function public.portal_log_document_change();

create table if not exists public.authorized_approval_officers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  designation text not null default 'Pending management confirmation',
  can_approve_applications boolean not null default false,
  active boolean not null default false,
  approved_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.authorized_approval_officers enable row level security;
drop policy if exists "Staff read approval officers" on public.authorized_approval_officers;
create policy "Staff read approval officers" on public.authorized_approval_officers for select to authenticated using(public.portal_is_case_worker());
drop policy if exists "Admin manage approval officers" on public.authorized_approval_officers;
create policy "Admin manage approval officers" on public.authorized_approval_officers for all to authenticated using(public.portal_is_admin()) with check(public.portal_is_admin());
grant select,insert,update,delete on public.authorized_approval_officers to authenticated;
drop trigger if exists portal_audit_officers on public.authorized_approval_officers;
create trigger portal_audit_officers after insert or update or delete on public.authorized_approval_officers for each row execute function public.portal_write_audit_log();
create or replace function public.portal_can_approve()
returns boolean language sql stable security definer set search_path=public
as $$ select public.portal_is_admin() or exists(select 1 from public.authorized_approval_officers o join public.portal_profiles p on p.id=o.user_id where o.user_id=auth.uid() and p.role='board' and o.active and o.can_approve_applications) $$;
create or replace function public.portal_is_legal_reviewer()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.portal_profiles where id=auth.uid() and role='legal_reviewer') $$;
create or replace function public.portal_protect_profile_role()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.portal_is_admin() then raise exception 'Only Trinity administrators can change account roles'; end if;
  if new.role is distinct from old.role and auth.uid() is not null and new.id=auth.uid() then raise exception 'Administrators cannot change their own portal role'; end if;
  return new;
end $$;
drop trigger if exists portal_profile_role_guard on public.portal_profiles;
create trigger portal_profile_role_guard before update on public.portal_profiles for each row execute function public.portal_protect_profile_role();
drop policy if exists "Staff update applications" on public.student_applications;
create policy "Staff update applications" on public.student_applications for update to authenticated
  using(public.portal_is_case_worker()) with check(public.portal_is_case_worker() and (status<>'application_approved' or public.portal_can_approve()));

create table if not exists public.student_payment_schedules (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.student_applications(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  currency text not null default 'LKR',
  total_fee numeric(12,2) not null check(total_fee>=0),
  initial_payment numeric(12,2) not null default 0 check(initial_payment>=0),
  balance numeric(12,2) not null check(balance>=0),
  included_services text[] not null default array[]::text[],
  excluded_expenses text[] not null default array[]::text[],
  payment_methods text[] not null default array[]::text[],
  refund_policy_snapshot jsonb not null default '{}'::jsonb,
  agreed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check(initial_payment+balance=total_fee)
);
create table if not exists public.payment_installments (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.student_payment_schedules(id) on delete cascade,
  amount numeric(12,2) not null check(amount>0),
  due_at date not null,
  label text not null default 'Instalment',
  created_at timestamptz not null default now()
);
alter table public.student_payment_schedules enable row level security;
alter table public.payment_installments enable row level security;
drop policy if exists "Payment schedule student or staff read" on public.student_payment_schedules;
create policy "Payment schedule student or staff read" on public.student_payment_schedules for select to authenticated using(student_id=auth.uid() or public.portal_is_case_worker());
drop policy if exists "Admin manages payment schedule" on public.student_payment_schedules;
create policy "Admin manages payment schedule" on public.student_payment_schedules for all to authenticated using(public.portal_is_admin()) with check(public.portal_is_admin());
drop policy if exists "Payment installments student or staff read" on public.payment_installments;
create policy "Payment installments student or staff read" on public.payment_installments for select to authenticated using(public.portal_is_case_worker() or exists(select 1 from public.student_payment_schedules p where p.id=schedule_id and p.student_id=auth.uid()));
drop policy if exists "Admin manages installments" on public.payment_installments;
create policy "Admin manages installments" on public.payment_installments for all to authenticated using(public.portal_is_admin()) with check(public.portal_is_admin());
grant select,insert,update,delete on public.student_payment_schedules,public.payment_installments to authenticated;
drop trigger if exists portal_audit_schedules on public.student_payment_schedules;
create trigger portal_audit_schedules after insert or update or delete on public.student_payment_schedules for each row execute function public.portal_write_audit_log();

create table if not exists public.approval_letters (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.student_applications(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  reference_number text unique not null,
  storage_path text not null,
  approved_by uuid not null references auth.users(id),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.approval_letters enable row level security;
drop policy if exists "Approval letters student or staff read" on public.approval_letters;
create policy "Approval letters student or staff read" on public.approval_letters for select to authenticated using(student_id=auth.uid() or public.portal_is_case_worker());
grant select on public.approval_letters to authenticated;
drop trigger if exists portal_audit_approval_letters on public.approval_letters;
create trigger portal_audit_approval_letters after insert on public.approval_letters for each row execute function public.portal_write_audit_log();

drop policy if exists "Admins manage templates" on public.agreement_templates;
create policy "Admins manage templates" on public.agreement_templates for all to authenticated
  using(public.portal_is_admin()) with check(public.portal_is_admin());
drop policy if exists "Legal reviewers approve templates" on public.agreement_templates;
create policy "Legal reviewers approve templates" on public.agreement_templates for update to authenticated
  using(public.portal_is_legal_reviewer()) with check(public.portal_is_legal_reviewer() and approval_status in ('approved','rejected','pending_legal_review'));
grant update (approval_status,approved_by,approved_at,legal_review_note,active) on public.agreement_templates to authenticated;
create or replace function public.portal_protect_template_approval()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if tg_op='UPDATE' and (new.name is distinct from old.name or new.body is distinct from old.body or new.version is distinct from old.version) then
    if not public.portal_is_admin() then raise exception 'Only administrators may edit template content'; end if;
    new.approval_status:='draft'; new.active:=false; new.approved_by:=null; new.approved_at:=null;
  end if;
  if new.approval_status='approved' and not public.portal_is_legal_reviewer() then raise exception 'A designated legal reviewer must approve agreement templates'; end if;
  if new.approval_status='approved' and new.created_by=auth.uid() then raise exception 'The template author cannot approve the template'; end if;
  if new.approval_status='approved' then new.approved_by:=auth.uid();new.approved_at:=coalesce(new.approved_at,now());end if;
  if new.active and new.approval_status<>'approved' then raise exception 'Only an approved agreement template can be active'; end if;
  return new;
end $$;
drop trigger if exists portal_template_approval_guard on public.agreement_templates;
create trigger portal_template_approval_guard before insert or update on public.agreement_templates for each row execute function public.portal_protect_template_approval();

drop policy if exists "Agreements self or staff read" on public.student_agreements;
create policy "Agreements self or staff read" on public.student_agreements for select to authenticated
  using((student_id=auth.uid() and head_signed_at is not null) or public.portal_is_case_worker());
alter table public.student_agreements add column if not exists signature_envelope_id text;
create or replace function public.portal_my_agreements()
returns table(id uuid,application_id uuid,reference_number text,status text,created_at timestamptz,head_signed_at timestamptz,student_signed_at timestamptz)
language sql stable security definer set search_path=public
as $$ select a.id,a.application_id,a.reference_number,a.status,a.created_at,a.head_signed_at,a.student_signed_at from public.student_agreements a where a.student_id=auth.uid() $$;
grant execute on function public.portal_my_agreements() to authenticated;
revoke all on function public.portal_my_agreements() from public,anon;
create table if not exists public.agreement_signing_sessions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.student_agreements(id) on delete cascade,
  signer_id uuid not null references auth.users(id),
  signer_role text not null check(signer_role in ('head','delegate','signatory','student')),
  provider text not null,
  provider_envelope_id text unique,
  status text not null default 'envelope_open' check(status in ('envelope_open','signed','cancelled','failed')),
  document_sha256 text not null,
  created_at timestamptz not null default now(),
  signed_at timestamptz
);
alter table public.agreement_signing_sessions enable row level security;
drop policy if exists "Staff read agreement signing sessions" on public.agreement_signing_sessions;
create policy "Staff read agreement signing sessions" on public.agreement_signing_sessions for select to authenticated using(public.portal_is_case_worker());
grant select on public.agreement_signing_sessions to authenticated;
drop trigger if exists portal_audit_signing_sessions on public.agreement_signing_sessions;
create trigger portal_audit_signing_sessions after insert or update on public.agreement_signing_sessions for each row execute function public.portal_write_audit_log();

alter table public.student_applications drop constraint if exists student_applications_status_check;
alter table public.student_applications add constraint student_applications_status_check check(status in (
  'application_submitted','documents_uploaded','under_board_review','documents_verified','application_approved','application_rejected','agreement_pending',
  'approval_letter_generated','agreement_generated','awaiting_head_signature','agreement_sent_to_student','student_agreement_signed','process_completed'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('student-private-letters','student-private-letters',false,20971520,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=20971520;
drop policy if exists "Students or staff read private approval letters" on storage.objects;
create policy "Students or staff read private approval letters" on storage.objects for select to authenticated
using(bucket_id='student-private-letters' and ((storage.foldername(name))[1]=auth.uid()::text or public.portal_is_case_worker()));

insert into public.agreement_templates(name,body,version,active,approval_status)
select 'Student Consultancy Service Agreement — Management and Legal Draft',
$draft$TRINITY INTERNATIONAL
STUDENT CONSULTANCY SERVICE AGREEMENT
Draft – Subject to Management and Legal Approval

1. Parties to the Agreement
Trinity International. Registered Business Name: [Insert Registered Name]. Business Registration Number: [Insert Number]. Registered Address: [Insert Address].
Student Full Name: [Student Name]. NIC/Passport Number: [Identification Number]. Student ID: [System Generated ID]. Residential Address: [Student Address].

2. Purpose of the Agreement
The purpose of this agreement is to establish the terms and conditions under which Trinity International provides educational consultancy and application assistance services to the Student seeking overseas education opportunities.

3. Scope of Consultancy Services
Subject to the selected service package, Trinity International may provide educational counselling and study destination guidance; assistance with university and course selection; guidance regarding admission requirements; university application preparation and submission assistance; academic document verification and review; student visa application guidance and document preparation assistance; interview preparation where applicable; communication assistance with educational institutions; and pre-departure guidance and relevant student support. Any additional services must be agreed upon in writing.

4. Student Responsibilities
The Student agrees to submit genuine, complete and accurate documentation; provide accurate academic, financial and personal information; respond to reasonable requests for additional documentation; pay agreed consultancy charges by the specified deadlines; attend required appointments and interviews; comply with applicable university and immigration requirements; and immediately inform Trinity International of changes affecting the application. Submitting false or misleading information may result in suspension or termination of consultancy services, subject to applicable law and the agreement's termination provisions.

5. Consultancy Fees and Payment Terms
The Student agrees to pay the consultancy charges specified in the individual Service and Payment Schedule attached to this agreement. The schedule must specify total consultancy fee; initial payment or registration fee, if applicable; remaining balance; instalment amounts and due dates; included services; excluded third-party expenses; and accepted payment methods. All payments must be acknowledged through an official Trinity International receipt. University tuition fees, visa application charges, medical examination fees, insurance, translation fees and other third-party charges are separate unless expressly included in the agreed service package. No additional consultancy charges shall be imposed without prior disclosure and agreement.
Individual service and payment schedule: [Service and Payment Schedule]

6. Refund and Cancellation Policy
Refund eligibility shall depend on the services already provided, the reason for cancellation, applicable law and the individual Service and Payment Schedule. Where the Student requests cancellation, Trinity International shall provide an itemized statement identifying services performed and any applicable deductions. Where Trinity International is unable to provide agreed services, the Student may request a refund of the relevant unperformed services, subject to applicable legal requirements. Third-party fees already paid to universities, government authorities or other service providers shall be governed by those providers' respective refund policies. No provision in this agreement shall exclude or restrict any non-excludable statutory consumer rights. Refund policy: [Approved Refund Policy]. No unapproved refund conditions are enforced.

7. University Admission and Visa Decisions
University admission, scholarship awards and visa approvals are determined by the relevant universities, scholarship providers and government authorities. Trinity International provides consultancy and application assistance services and does not guarantee admission, scholarship approval or visa issuance. Trinity International remains responsible for performing its agreed consultancy services in accordance with this agreement and applicable law.

8. Document Verification and Approval
Student documents submitted through the Trinity International Student Portal are subject to internal review. Trinity International may request clarification, corrections or additional supporting documents. An internal approval letter confirms that the Student has completed Trinity International's relevant internal review process. It does not constitute a university admission offer or government visa approval.

9. Personal Data and Confidentiality
Trinity International shall process student information for legitimate and disclosed purposes related to consultancy services. Personal information may be shared with relevant educational institutions, authorized application service providers and immigration-related entities where a lawful basis exists and where necessary for the agreed services. Trinity International shall implement appropriate security measures to protect personal information against unauthorized access, disclosure, alteration or loss. Students shall receive a separate Privacy Notice explaining data processing purposes, applicable rights, retention periods, international transfers and relevant contact details.

10. Electronic Documents and Signatures
The parties may use the Trinity International digital platform to review, receive and electronically sign this agreement, subject to applicable law. The system records relevant signing information, including document version, signer identity, date, time and signing activity. The completed agreement is securely stored and made available to both parties.

11. Termination
Either party may request termination of this agreement by providing written notice. Termination is subject to the approved cancellation and refund conditions, services already performed and applicable law. The parties shall cooperate in resolving outstanding payments, refunds and document-return requests.

12. Complaints and Dispute Resolution
Any complaint relating to consultancy services should initially be submitted to Trinity International through its official complaints contact. The parties shall attempt to resolve disputes through good-faith communication. If a dispute remains unresolved, either party may pursue remedies available under applicable Sri Lankan law.

13. Governing Law
This agreement shall be governed by the laws of Sri Lanka, subject to any applicable mandatory legal requirements.

14. Declaration
By signing this agreement, both parties confirm that they have been given an opportunity to review its terms and understand their respective obligations.

For Trinity International — Authorized Signatory: [Full Name]. Designation: [Official Designation]. Signature: [Authenticated Electronic Signature]. Date: [Automatically Generated].
Student — Full Name: [Student Name]. Signature: [Authenticated Electronic Signature]. Date: [Automatically Generated].
Agreement Reference: [Automatically Generated].$draft$,
1,false,'draft'
where not exists(select 1 from public.agreement_templates where name='Student Consultancy Service Agreement — Management and Legal Draft');

-- Refund enforcement remains disabled until management and legal counsel approve it.
-- Provider credentials belong in server environment secrets, never in this table.
