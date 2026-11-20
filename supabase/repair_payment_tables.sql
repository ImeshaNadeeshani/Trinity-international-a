-- Restore missing payment records and receipt storage without changing existing fees.
begin;
create table if not exists public.portal_payments(
 id uuid primary key default gen_random_uuid(),student_id uuid not null references auth.users(id),application_id uuid not null references student_applications(id),
 schedule_id uuid not null references student_payment_schedules(id),item_key text not null,description text not null,amount numeric(12,2) not null check(amount>0),currency text not null,
 status text not null default 'pending' check(status in ('pending','processing','successful','failed','refunded')),gateway_reference text unique,checkout_url text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(schedule_id,item_key)
);
create table if not exists public.payment_transactions(id uuid primary key default gen_random_uuid(),payment_id uuid not null references portal_payments(id),event_id text not null unique,gateway_reference text not null,status text not null,amount numeric(12,2) not null,currency text not null,created_at timestamptz not null default now());
create table if not exists public.payment_receipts(id uuid primary key default gen_random_uuid(),payment_id uuid not null unique references portal_payments(id),reference text not null unique,pdf_path text not null,sha256 text not null,created_at timestamptz not null default now());
alter table portal_payments enable row level security;
alter table payment_transactions enable row level security;
alter table payment_receipts enable row level security;
drop policy if exists "Read own payments" on portal_payments;
create policy "Read own payments" on portal_payments for select to authenticated using(student_id=auth.uid() or portal_is_case_worker());
drop policy if exists "Read own transactions" on payment_transactions;
create policy "Read own transactions" on payment_transactions for select to authenticated using(portal_is_case_worker() or exists(select 1 from portal_payments p where p.id=payment_id and p.student_id=auth.uid()));
drop policy if exists "Read own receipts" on payment_receipts;
create policy "Read own receipts" on payment_receipts for select to authenticated using(portal_is_case_worker() or exists(select 1 from portal_payments p where p.id=payment_id and p.student_id=auth.uid()));
grant select on portal_payments,payment_transactions,payment_receipts to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('student-private-receipts','student-private-receipts',false,2097152,array['application/pdf']) on conflict(id) do nothing;
drop policy if exists "Read own receipt PDF" on storage.objects;
create policy "Read own receipt PDF" on storage.objects for select to authenticated using(bucket_id='student-private-receipts' and (public.portal_is_case_worker() or exists(select 1 from public.payment_receipts r join public.portal_payments p on p.id=r.payment_id where r.pdf_path=storage.objects.name and p.student_id=auth.uid())));

create or replace function public.portal_begin_payment(schedule uuid,item text,actor uuid) returns public.portal_payments language plpgsql security definer set search_path=public as $$
declare s student_payment_schedules; p portal_payments; fee numeric; label text;
begin
 select * into strict s from student_payment_schedules where id=schedule and student_id=actor for update;
 if not exists(select 1 from student_agreements where application_id=s.application_id and student_id=actor and not is_sample and status='completed' and student_signed_at is not null and head_signed_at is not null and completed_pdf_path is not null) then raise exception 'Complete the agreement before paying';end if;
 if item='initial' then fee:=s.initial_payment;label:='Initial consultancy payment';
 else select amount,payment_installments.label into strict fee,label from payment_installments where id=item::uuid and schedule_id=s.id;end if;
 if fee<=0 then raise exception 'No payable amount';end if;
 insert into portal_payments(student_id,application_id,schedule_id,item_key,description,amount,currency) values(actor,s.application_id,s.id,item,label,fee,s.currency) on conflict(schedule_id,item_key) do nothing;
 select * into strict p from portal_payments where schedule_id=s.id and item_key=item;
 if p.status in ('successful','refunded') then raise exception 'This payment has already been settled';end if;return p;
end $$;
revoke all on function portal_begin_payment(uuid,text,uuid) from public,anon,authenticated;
grant execute on function portal_begin_payment(uuid,text,uuid) to service_role;

create or replace function public.portal_record_payment_event(payment uuid,event text,gateway_ref text,event_status text,event_amount numeric,event_currency text,receipt_path text,receipt_hash text) returns text language plpgsql security definer set search_path=public as $$
declare p portal_payments;
begin
 select * into strict p from portal_payments where id=payment for update;
 if exists(select 1 from payment_transactions where event_id=event) then return p.status;end if;
 if p.amount<>event_amount or p.currency<>event_currency or p.gateway_reference is distinct from gateway_ref then raise exception 'Payment callback does not match the checkout';end if;
 if event_status not in ('processing','successful','failed','refunded') then raise exception 'Unsupported payment status';end if;
 if p.status='refunded' or (p.status='successful' and event_status<>'refunded') or (event_status='refunded' and p.status<>'successful') then raise exception 'Invalid payment transition';end if;
 if event_status='successful' and (receipt_path is null or receipt_hash is null) then raise exception 'Receipt required';end if;
 insert into payment_transactions(payment_id,event_id,gateway_reference,status,amount,currency) values(p.id,event,gateway_ref,event_status,event_amount,event_currency);
 update portal_payments set status=event_status,updated_at=now() where id=p.id;
 if event_status='successful' then
  insert into payment_receipts(payment_id,reference,pdf_path,sha256) values(p.id,'TI-RCT-'||p.id::text,receipt_path,receipt_hash);
  insert into application_activity(application_id,event_type,details) values(p.application_id,'payment_successful',jsonb_build_object('payment_id',p.id,'gateway_reference',gateway_ref));
  insert into student_notifications(student_id,title,message) values(p.student_id,'Payment successful','Your payment was confirmed. Your receipt is available in Payments.');
  perform portal_notify_staff('Student payment received',p.description||' — '||p.currency||' '||p.amount::text);
 elsif event_status in ('failed','refunded') then
  insert into student_notifications(student_id,title,message) values(p.student_id,'Payment '||event_status,'Open Payments for the latest status and contact Trinity if you need help.');
  perform portal_notify_staff('Student payment '||event_status,p.id::text);
 end if;
 return event_status;
end $$;
revoke all on function portal_record_payment_event(uuid,text,text,text,numeric,text,text,text) from public,anon,authenticated;
grant execute on function portal_record_payment_event(uuid,text,text,text,numeric,text,text,text) to service_role;


grant select,insert,update on public.portal_payments,public.payment_transactions,public.payment_receipts to service_role;
notify pgrst,'reload schema';
commit;
