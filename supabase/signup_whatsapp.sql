begin;
alter table public.portal_profiles add column if not exists whatsapp_number text not null default '';
alter table public.portal_profiles add column if not exists whatsapp_updates_consent boolean not null default false;
alter table public.portal_profiles add column if not exists whatsapp_consent_at timestamptz;
create or replace function public.portal_save_signup_whatsapp()
returns trigger language plpgsql security definer set search_path=public as $$
declare number text; consent boolean;
begin
 number:=regexp_replace(coalesce(new.raw_user_meta_data->>'whatsapp_number',''),'[[:space:]()-]','','g');
 if number<>'' and number !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'WhatsApp number must include a valid country code';end if;
 consent:=coalesce(new.raw_user_meta_data->>'whatsapp_updates_consent','false')='true' and number<>'';
 update public.portal_profiles set whatsapp_number=number,whatsapp_updates_consent=consent,whatsapp_consent_at=case when consent then now() else null end where id=new.id;
 return new;
end $$;
revoke all on function public.portal_save_signup_whatsapp() from public,anon,authenticated;
drop trigger if exists portal_auth_whatsapp_created on auth.users;
create trigger portal_auth_whatsapp_created after insert on auth.users for each row execute function public.portal_save_signup_whatsapp();
notify pgrst, 'reload schema';
commit;
