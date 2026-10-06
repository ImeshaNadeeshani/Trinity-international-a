-- Apply after workflow_extensions.sql. OCR storage and payment visibility.
begin;
create table if not exists public.document_extractions (
  document_id uuid primary key references public.student_documents(id) on delete cascade,
  student_id uuid not null references auth.users(id),
  fields jsonb not null default '{}',
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.document_extractions enable row level security;
create policy "Read own extracted details" on public.document_extractions for select to authenticated using(student_id=auth.uid() or public.portal_is_case_worker());
grant select on public.document_extractions to authenticated;

-- Payment availability is enforced in the database, not just hidden in the UI.
create or replace function public.portal_payment_unlocked(app_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from student_agreements where application_id=app_id and student_id=auth.uid()
    and head_signed_at is not null and student_signed_at is not null and status='completed' and completed_pdf_path is not null)
$$;
revoke all on function public.portal_payment_unlocked(uuid) from public,anon;
grant execute on function public.portal_payment_unlocked(uuid) to authenticated;
drop policy if exists "Payment schedule student or staff read" on public.student_payment_schedules;
create policy "Payment schedule student or staff read" on public.student_payment_schedules for select to authenticated
using(public.portal_is_case_worker() or (student_id=auth.uid() and public.portal_payment_unlocked(application_id)));
drop policy if exists "Payment installments student or staff read" on public.payment_installments;
create policy "Payment installments student or staff read" on public.payment_installments for select to authenticated
using(public.portal_is_case_worker() or exists(select 1 from student_payment_schedules s where s.id=schedule_id and s.student_id=auth.uid() and public.portal_payment_unlocked(s.application_id)));
commit;
