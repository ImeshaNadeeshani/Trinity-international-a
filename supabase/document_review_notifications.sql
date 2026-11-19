begin;
alter table public.student_notifications add column if not exists document_id uuid references public.student_documents(id) on delete set null;
-- Save the portal notification in the same transaction as the review decision.
create or replace function public.portal_notify_document_review()
returns trigger language plpgsql security definer set search_path=public as $$
declare heading text; body text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status='verified' then
    heading:='Document approved';
    body:=format('Trinity management approved your %s document (%s).', replace(new.category,'_',' '),new.file_name);
  elsif new.status in ('rejected','correction_requested') then
    heading:=case when new.status='rejected' then 'Document replacement required' else 'Document correction requested' end;
    body:=format('Trinity management reviewed your %s document (%s). Please upload a corrected copy.',replace(new.category,'_',' '),new.file_name);
  else return new;
  end if;
  if nullif(trim(new.reviewer_comment),'') is not null then
    body:=body||E'\n\nReviewer note: '||new.reviewer_comment;
  end if;
  insert into public.student_notifications(student_id,title,message,document_id) values(new.student_id,heading,body,new.id);
  return new;
end;
$$;
revoke all on function public.portal_notify_document_review() from public,anon,authenticated;
drop trigger if exists portal_document_review_notification on public.student_documents;
create trigger portal_document_review_notification after update of status on public.student_documents
for each row execute function public.portal_notify_document_review();
commit;
