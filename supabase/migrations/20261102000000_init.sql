-- Sobremesa Dinners: initial schema
--
-- Access model
--   * The public site never talks to these tables directly. Form submissions go
--     through Next.js route handlers, which validate input and insert with the
--     server-only secret key.
--   * The only thing anonymous visitors can read is published events.
--   * Everything else is readable and editable only by signed-in admins, whose
--     emails are listed in public.admins.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- admins
create table public.admins (
  email text primary key check (email = lower(email))
);

insert into public.admins (email) values
  ('diezcanedot@gmail.com'),
  ('dolavarrietag@gmail.com');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------- events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  number int not null unique check (number > 0),
  title_es text not null check (char_length(title_es) between 1 and 160),
  title_en text not null check (char_length(title_en) between 1 and 160),
  starts_at timestamptz,
  city text check (city in ('berkeley', 'sf')),
  venue text,
  sponsor text,
  status text not null default 'draft' check (status in ('draft', 'upcoming', 'past')),
  applications_open boolean not null default false,
  speakers_needed int not null default 3 check (speakers_needed between 0 and 10),
  notes text
);

insert into public.events (number, title_es, title_en, starts_at, city, status, applications_open) values
  (1, 'Emprender siendo latino', 'Entrepreneurship as a Latino', '2026-11-17 19:00-08', 'berkeley', 'upcoming', true),
  (2, 'Go-to-market y estrategia', 'Go-to-market & strategy', null, 'sf', 'upcoming', false),
  (3, 'Inteligencia artificial', 'Artificial intelligence', null, null, 'upcoming', false);

-- ---------------------------------------------------------------- speakers
create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  linkedin_url text not null,
  company text not null,
  role text not null,
  industry text not null,
  weekdays text[] not null default '{}',
  available_weeks date[] not null default '{}',  -- Mondays of the weeks they can do
  cities text[] not null default '{}',
  motivations text[] not null default '{}',
  motivation_other text,
  can_host boolean not null default false,
  can_sponsor boolean not null default false,
  hiring boolean not null default false,
  dietary text,
  roots text,
  heard_from text,
  lang text not null default 'es' check (lang in ('es', 'en')),
  status text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'declined')),
  notes text
);

-- A speaker's link to a dinner: open-seat answers from the form, or admin placement.
create table public.event_speakers (
  event_id uuid not null references public.events (id) on delete cascade,
  speaker_id uuid not null references public.speakers (id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'interested'
    check (status in ('interested', 'maybe', 'invited', 'confirmed', 'declined')),
  source text not null default 'admin' check (source in ('form', 'admin')),
  primary key (event_id, speaker_id)
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  referred_by uuid references public.speakers (id) on delete set null,
  name text not null,
  linkedin_url text,
  email text,
  reason text,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'skipped')),
  notes text
);

-- ---------------------------------------------------------------- students
create table public.students (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete restrict,
  name text not null,
  email text not null,
  linkedin_url text,
  university text not null,
  program text not null,
  year text not null check (year in ('1', '2')),
  essay text not null
    check (coalesce(array_length(regexp_split_to_array(btrim(essay), '\s+'), 1), 0) <= 200),
  lang text not null default 'es' check (lang in ('es', 'en')),
  status text not null default 'applied'
    check (status in ('applied', 'accepted', 'waitlist', 'rejected', 'confirmed', 'attended')),
  notes text,
  unique (event_id, email)
);

-- ---------------------------------------------------------------- proposals
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  kind text not null check (kind in ('speakers', 'topics', 'both')),
  status text not null default 'new' check (status in ('new', 'reviewed', 'used', 'skipped')),
  notes text
);

create table public.proposal_speakers (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  name text not null,
  company text,
  role text,
  linkedin_url text,
  reason text
);

create table public.proposal_topics (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  title text not null,
  description text
);

-- ---------------------------------------------------------------- row level security
alter table public.admins enable row level security;
alter table public.events enable row level security;
alter table public.speakers enable row level security;
alter table public.event_speakers enable row level security;
alter table public.referrals enable row level security;
alter table public.students enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_speakers enable row level security;
alter table public.proposal_topics enable row level security;

create policy "admins read admins" on public.admins
  for select to authenticated using (public.is_admin());

create policy "public reads published events" on public.events
  for select to anon using (status in ('upcoming', 'past'));

-- Venues can be someone's home: visitors only get the columns the site shows.
revoke select on public.events from anon;
grant select (id, number, title_es, title_en, starts_at, city, status, applications_open)
  on public.events to anon;

-- Upcoming dinners still missing speakers, for the "are you free?" question.
create or replace function public.open_speaker_seats()
returns table (event_id uuid, seats_left int)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.speakers_needed - count(es.speaker_id) filter (where es.status = 'confirmed')
  from public.events e
  left join public.event_speakers es on es.event_id = e.id
  where e.status = 'upcoming'
  group by e.id
  having e.speakers_needed - count(es.speaker_id) filter (where es.status = 'confirmed') > 0;
$$;

revoke execute on function public.open_speaker_seats() from public;
grant execute on function public.open_speaker_seats() to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'events', 'speakers', 'event_speakers', 'referrals', 'students',
    'proposals', 'proposal_speakers', 'proposal_topics'
  ] loop
    execute format(
      'create policy "admins manage %1$s" on public.%1$I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
