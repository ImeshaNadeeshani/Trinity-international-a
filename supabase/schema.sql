create table if not exists public.contact_submissions (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null check (char_length(phone) between 5 and 30),
  subject text not null check (char_length(subject) between 1 and 100),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.consultation_requests (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (char_length(phone) between 5 and 30),
  email text not null check (char_length(email) between 3 and 254),
  age integer not null check (age between 15 and 100),
  destination text not null check (char_length(destination) between 1 and 100),
  education text not null check (char_length(education) between 1 and 200),
  ielts text not null check (char_length(ielts) between 1 and 50),
  service text not null check (char_length(service) between 1 and 100),
  interest text not null check (char_length(interest) between 1 and 100),
  profile text not null check (char_length(profile) between 1 and 100),
  message text check (message is null or char_length(message) <= 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;
alter table public.consultation_requests enable row level security;

revoke all on public.contact_submissions from anon, authenticated;
revoke all on public.consultation_requests from anon, authenticated;
grant insert on public.contact_submissions to anon, authenticated;
grant insert on public.consultation_requests to anon, authenticated;

drop policy if exists "Anyone can submit a contact request" on public.contact_submissions;
create policy "Anyone can submit a contact request"
on public.contact_submissions for insert
to anon, authenticated
with check (true);

drop policy if exists "Anyone can submit a consultation request" on public.consultation_requests;
create policy "Anyone can submit a consultation request"
on public.consultation_requests for insert
to anon, authenticated
with check (true);
