-- Apply after student_workflow.sql.
begin;
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
create table public.portal_payments(
 id uuid primary key default gen_random_uuid(),student_id uuid not null references auth.users(id),application_id uuid not null references student_applications(id),
 schedule_id uuid not null references student_payment_schedules(id),item_key text not null,description text not null,amount numeric(12,2) not null check(amount>0),currency text not null,
 status text not null default 'pending' check(status in ('pending','processing','successful','failed','refunded')),gateway_reference text unique,checkout_url text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(schedule_id,item_key)
);
create table public.payment_transactions(id uuid primary key default gen_random_uuid(),payment_id uuid not null references portal_payments(id),event_id text not null unique,gateway_reference text not null,status text not null,amount numeric(12,2) not null,currency text not null,created_at timestamptz not null default now());
create table public.payment_receipts(id uuid primary key default gen_random_uuid(),payment_id uuid not null unique references portal_payments(id),reference text not null unique,pdf_path text not null,sha256 text not null,created_at timestamptz not null default now());
alter table portal_payments enable row level security;
alter table payment_transactions enable row level security;
alter table payment_receipts enable row level security;
create policy "Read own payments" on portal_payments for select to authenticated using(student_id=auth.uid() or portal_is_case_worker());
create policy "Read own transactions" on payment_transactions for select to authenticated using(portal_is_case_worker() or exists(select 1 from portal_payments p where p.id=payment_id and p.student_id=auth.uid()));
create policy "Read own receipts" on payment_receipts for select to authenticated using(portal_is_case_worker() or exists(select 1 from portal_payments p where p.id=payment_id and p.student_id=auth.uid()));
grant select on portal_payments,payment_transactions,payment_receipts to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('student-private-receipts','student-private-receipts',false,2097152,array['application/pdf']) on conflict(id) do nothing;
create policy "Read own receipt PDF" on storage.objects for select to authenticated using(bucket_id='student-private-receipts' and (public.portal_is_case_worker() or exists(select 1 from public.payment_receipts r join public.portal_payments p on p.id=r.payment_id where r.pdf_path=storage.objects.name and p.student_id=auth.uid())));

create function public.portal_begin_payment(schedule uuid,item text,actor uuid) returns public.portal_payments language plpgsql security definer set search_path=public as $$
declare s student_payment_schedules; p portal_payments; fee numeric; label text;
begin
 select * into strict s from student_payment_schedules where id=schedule and student_id=actor for update;
 if not exists(select 1 from student_agreements where application_id=s.application_id and student_id=actor and status='completed' and student_signed_at is not null and head_signed_at is not null and completed_pdf_path is not null) then raise exception 'Complete the agreement before paying';end if;
 if item='initial' then fee:=s.initial_payment;label:='Initial consultancy payment';
 else select amount,payment_installments.label into strict fee,label from payment_installments where id=item::uuid and schedule_id=s.id;end if;
 if fee<=0 then raise exception 'No payable amount';end if;
 insert into portal_payments(student_id,application_id,schedule_id,item_key,description,amount,currency) values(actor,s.application_id,s.id,item,label,fee,s.currency) on conflict(schedule_id,item_key) do nothing;
 select * into strict p from portal_payments where schedule_id=s.id and item_key=item;
 if p.status in ('successful','refunded') then raise exception 'This payment has already been settled';end if;return p;
end $$;
revoke all on function portal_begin_payment(uuid,text,uuid) from public,anon,authenticated;
grant execute on function portal_begin_payment(uuid,text,uuid) to service_role;

create function public.portal_record_payment_event(payment uuid,event text,gateway_ref text,event_status text,event_amount numeric,event_currency text,receipt_path text,receipt_hash text) returns text language plpgsql security definer set search_path=public as $$
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

create function public.portal_lock_contract_fees() returns trigger language plpgsql security definer set search_path=public as $$
declare app uuid;
begin
 if tg_table_name='student_payment_schedules' then app:=case when tg_op='DELETE' then old.application_id else new.application_id end;
 else select application_id into app from student_payment_schedules where id=case when tg_op='DELETE' then old.schedule_id else new.schedule_id end;end if;
 if exists(select 1 from student_agreements where application_id=app and status<>'voided') then raise exception 'Fees are locked by an existing agreement';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger portal_fee_lock before insert or update or delete on student_payment_schedules for each row execute function portal_lock_contract_fees();
create trigger portal_installment_lock before insert or update or delete on payment_installments for each row execute function portal_lock_contract_fees();
-- A durable outbox allows a scheduled worker to retry transactional emails.
create table public.portal_email_outbox(id uuid primary key default gen_random_uuid(),notification_id uuid not null unique references student_notifications(id),status text not null default 'pending',attempts integer not null default 0,last_attempt_at timestamptz,created_at timestamptz not null default now());
alter table portal_email_outbox enable row level security;
create function public.portal_queue_email() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into portal_email_outbox(notification_id) values(new.id);return new;end $$;
create trigger portal_email_queue after insert on student_notifications for each row execute function portal_queue_email();
commit;
