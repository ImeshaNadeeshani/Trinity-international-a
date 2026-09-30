-- Student document verification portal foundation.
-- Apply in the Supabase SQL editor after configuring Supabase Auth.
-- Staff roles must be assigned by a trusted administrator; never from the browser.

create sequence if not exists public.student_number_seq;

create table if not exists public.portal_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_number text unique,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'student' check (role in ('student','board','admin','head','delegate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.portal_is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.portal_profiles where id = auth.uid() and role in ('board','admin','head','delegate','signatory','legal_reviewer')) $$;

create or replace function public.portal_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.portal_profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.portal_is_case_worker()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.portal_profiles where id=auth.uid() and role in ('board','admin','head','delegate','signatory')) $$;

create or replace function public.portal_create_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.portal_profiles(id, student_number)
  values (new.id, 'TI-' || to_char(now(), 'YY') || '-' || lpad(nextval('public.student_number_seq')::text, 6, '0'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists portal_auth_user_created on auth.users;
create trigger portal_auth_user_created after insert on auth.users
for each row execute function public.portal_create_profile();

create table if not exists public.student_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  education_level text not null default '',
  course_interest text not null default '',
  status text not null default 'application_submitted' check (status in ('application_submitted','documents_uploaded','under_board_review','documents_verified','application_approved','application_rejected','agreement_pending')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_applications_student_id_idx on public.student_applications(student_id);

create table if not exists public.student_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.student_applications(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('passport','national_id','education','english_qualification','financial','other')),
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  status text not null default 'pending' check (status in ('pending','verified','rejected','correction_requested','replaced')),
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','infected','error')),
  scan_completed_at timestamptz,
  reviewer_comment text,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists student_documents_application_id_idx on public.student_documents(application_id);

create table if not exists public.application_activity (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.student_applications(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agreement_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  version integer not null default 1,
  active boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.student_agreements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.student_applications(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.agreement_templates(id),
  reference_number text unique not null,
  status text not null default 'awaiting_head_signature' check (status in ('awaiting_head_signature','awaiting_student_signature','completed','voided')),
  private_pdf_path text,
  completed_pdf_path text,
  created_at timestamptz not null default now(),
  head_signed_at timestamptz,
  student_signed_at timestamptz
);

create table if not exists public.agreement_signing_audit (
  id bigint generated always as identity primary key,
  agreement_id uuid not null references public.student_agreements(id) on delete cascade,
  signer_id uuid references auth.users(id) on delete set null,
  signer_role text not null,
  action text not null,
  document_sha256 text,
  created_at timestamptz not null default now()
);

alter table public.portal_profiles enable row level security;
alter table public.student_applications enable row level security;
alter table public.student_documents enable row level security;
alter table public.application_activity enable row level security;
alter table public.student_notifications enable row level security;
alter table public.agreement_templates enable row level security;
alter table public.student_agreements enable row level security;
alter table public.agreement_signing_audit enable row level security;

drop policy if exists "Profile self or staff read" on public.portal_profiles;
create policy "Profile self or staff read" on public.portal_profiles for select to authenticated using (id = auth.uid() or public.portal_is_case_worker());
drop policy if exists "Student profile update" on public.portal_profiles;
create policy "Student profile update" on public.portal_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant select on public.portal_profiles to authenticated;
grant update (full_name, phone) on public.portal_profiles to authenticated;

drop policy if exists "Applications self or staff read" on public.student_applications;
create policy "Applications self or staff read" on public.student_applications for select to authenticated using (student_id = auth.uid() or public.portal_is_case_worker());
drop policy if exists "Students create own application" on public.student_applications;
create policy "Students create own application" on public.student_applications for insert to authenticated with check (student_id = auth.uid() and status = 'application_submitted');
drop policy if exists "Students update own application details" on public.student_applications;
create policy "Students update own application details" on public.student_applications for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid() and status in ('application_submitted','documents_uploaded'));
drop policy if exists "Staff update applications" on public.student_applications;
create policy "Staff update applications" on public.student_applications for update to authenticated using (public.portal_is_case_worker()) with check (public.portal_is_case_worker());
grant select, insert, update (destination, education_level, course_interest, status, updated_at) on public.student_applications to authenticated;

drop policy if exists "Documents self or staff read" on public.student_documents;
create policy "Documents self or staff read" on public.student_documents for select to authenticated using (student_id = auth.uid() or public.portal_is_case_worker());
drop policy if exists "Students register own documents" on public.student_documents;
create policy "Students register own documents" on public.student_documents for insert to authenticated with check (student_id = auth.uid() and status = 'pending' and scan_status = 'pending' and exists(select 1 from public.student_applications a where a.id = application_id and a.student_id = auth.uid()));
drop policy if exists "Students replace rejected documents" on public.student_documents;
create policy "Students replace rejected documents" on public.student_documents for update to authenticated using (student_id = auth.uid() and status in ('rejected','correction_requested')) with check (student_id = auth.uid() and status = 'replaced');
drop policy if exists "Staff review documents" on public.student_documents;
create policy "Staff review documents" on public.student_documents for update to authenticated using (public.portal_is_case_worker() and scan_status='clean') with check (public.portal_is_case_worker() and scan_status='clean');
grant select, insert, update (file_name, storage_path, mime_type, size_bytes, status, reviewer_comment, reviewed_at) on public.student_documents to authenticated;

drop policy if exists "Activity self or staff read" on public.application_activity;
create policy "Activity self or staff read" on public.application_activity for select to authenticated using (public.portal_is_case_worker() or exists(select 1 from public.student_applications a where a.id = application_id and a.student_id = auth.uid()));
drop policy if exists "Staff add activity" on public.application_activity;
create policy "Staff add activity" on public.application_activity for insert to authenticated with check (public.portal_is_case_worker() and actor_id = auth.uid());
grant select, insert on public.application_activity to authenticated;

drop policy if exists "Student notifications read own" on public.student_notifications;
create policy "Student notifications read own" on public.student_notifications for select to authenticated using (student_id = auth.uid() or public.portal_is_case_worker());
drop policy if exists "Student mark notification read" on public.student_notifications;
create policy "Student mark notification read" on public.student_notifications for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
grant select, update (read_at) on public.student_notifications to authenticated;

drop policy if exists "Templates staff read" on public.agreement_templates;
create policy "Templates staff read" on public.agreement_templates for select to authenticated using (public.portal_is_staff());
drop policy if exists "Admins manage templates" on public.agreement_templates;
create policy "Admins manage templates" on public.agreement_templates for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());
grant select, insert, update, delete on public.agreement_templates to authenticated;

drop policy if exists "Agreements self or staff read" on public.student_agreements;
create policy "Agreements self or staff read" on public.student_agreements for select to authenticated using (student_id = auth.uid() or public.portal_is_case_worker());
grant select on public.student_agreements to authenticated;
drop policy if exists "Signing audit staff read" on public.agreement_signing_audit;
create policy "Signing audit staff read" on public.agreement_signing_audit for select to authenticated using (public.portal_is_case_worker());
grant select on public.agreement_signing_audit to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-private-documents','student-private-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-private-agreements','student-private-agreements',false,20971520,array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 20971520;

drop policy if exists "Students upload own documents" on storage.objects;
create policy "Students upload own documents" on storage.objects for insert to authenticated
with check (bucket_id = 'student-private-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Students or staff read private documents" on storage.objects;
create policy "Students or staff read private documents" on storage.objects for select to authenticated
using (bucket_id = 'student-private-documents' and ((storage.foldername(name))[1] = auth.uid()::text or (public.portal_is_case_worker() and exists(select 1 from public.student_documents d where d.storage_path=storage.objects.name and d.scan_status='clean'))));
drop policy if exists "Students replace own rejected file" on storage.objects;
create policy "Students replace own rejected file" on storage.objects for delete to authenticated
using (bucket_id = 'student-private-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Students or staff read private agreements" on storage.objects;
create policy "Students or staff read private agreements" on storage.objects for select to authenticated
using (bucket_id = 'student-private-agreements' and (public.portal_is_case_worker() or exists (
  select 1 from public.student_agreements a
  where a.student_id=auth.uid() and ((a.head_signed_at is not null and a.private_pdf_path=storage.objects.name)
    or (a.status='completed' and a.completed_pdf_path=storage.objects.name))
)));

-- Email, PDF generation, official letters, and signing must run in trusted server code.
-- Do not grant browser access to insert/update signed agreement records or audit entries.
