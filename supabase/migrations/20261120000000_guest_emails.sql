-- Guest emails: the emails to speakers and students around each dinner, payment
-- tracking, personal links (confirm a seat, give feedback), and the log the daily
-- reminder to the admins reads.

-- ---------------------------------------------------------------- dinners
alter table public.events
  add column price_usd int check (price_usd between 0 and 500),
  add column venmo_handle text check (venmo_handle ~ '^[A-Za-z0-9_-]{1,40}$'),
  add column hear_points text[] not null default '{}' check (cardinality(hear_points) <= 3);

-- ---------------------------------------------------------------- people
alter table public.speakers
  add column bio text check (char_length(bio) <= 400);

-- A personal code per guest per dinner, behind their feedback (and, for students,
-- confirm-your-seat) links. Unguessable; looked up only with the server key.
alter table public.event_speakers
  add column code text not null unique default left(replace(gen_random_uuid()::text, '-', ''), 16);

alter table public.students
  add column code text not null unique default left(replace(gen_random_uuid()::text, '-', ''), 16),
  add column share_profile boolean not null default false,  -- OK to share name and LinkedIn with speakers
  add column dietary text check (char_length(dietary) <= 200),
  add column seat_confirmed_at timestamptz,
  add column paid boolean not null default false,
  add column paid_at timestamptz;

-- ---------------------------------------------------------------- emails
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null check (kind in (
    'speaker_confirmed', 'speaker_week', 'speaker_day', 'speaker_after',
    'student_week', 'student_day', 'student_after'
  )),
  speaker_id uuid references public.speakers (id) on delete set null,
  student_id uuid references public.students (id) on delete set null,
  email text not null,
  sent_by text not null,
  provider_id text
);

-- The subject and opening paragraph as last edited, per dinner, email and language.
create table public.email_drafts (
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null,
  lang text not null check (lang in ('es', 'en')),
  subject text not null check (char_length(subject) <= 200),
  intro text not null check (char_length(intro) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (event_id, kind, lang)
);

-- ---------------------------------------------------------------- feedback
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  speaker_id uuid references public.speakers (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade,
  overall int not null check (overall between 1 and 5),
  food int check (food between 1 and 5),
  come_back text check (come_back in ('yes', 'maybe', 'no')),
  more_of text check (char_length(more_of) <= 1000),
  less_of text check (char_length(less_of) <= 1000),
  improve text check (char_length(improve) <= 1000),
  refer text check (char_length(refer) <= 1000),
  highlight text check (char_length(highlight) <= 400),
  quote_ok boolean not null default false,
  check ((speaker_id is null) <> (student_id is null)),
  unique (event_id, speaker_id),
  unique (event_id, student_id)
);

alter table public.email_log enable row level security;
alter table public.email_drafts enable row level security;
alter table public.feedback enable row level security;

do $$
declare t text;
begin
  foreach t in array array['email_log', 'email_drafts', 'feedback'] loop
    execute format(
      'create policy "admins manage %1$s" on public.%1$I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
