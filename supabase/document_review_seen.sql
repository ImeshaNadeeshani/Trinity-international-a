begin;
alter table public.student_documents add column if not exists management_seen_at timestamptz;
create or replace function public.portal_mark_document_seen(document_id uuid)
returns timestamptz language plpgsql security definer set search_path=public as $$
declare seen timestamptz;
begin
 if auth.uid() is null or not public.portal_is_case_worker() then raise exception 'Staff access required';end if;
 update public.student_documents set management_seen_at=coalesce(management_seen_at,now()) where id=document_id returning management_seen_at into seen;
 if not found then raise exception 'Document not found';end if;
 return seen;
end $$;
revoke all on function public.portal_mark_document_seen(uuid) from public,anon;
grant execute on function public.portal_mark_document_seen(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
