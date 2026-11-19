-- Personal invites for speakers the team already knows, and photos and quotes
-- for dinners that already happened.

-- ---------------------------------------------------------------- invites
-- An admin proposes up to three dates; the speaker answers at /invitacion/<code>.
-- Only admins read this table; the invite page and its answer go through the
-- server with the secret key, looked up by code.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null unique default left(replace(gen_random_uuid()::text, '-', ''), 16),
  speaker_id uuid not null references public.speakers (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  dates date[] not null check (cardinality(dates) between 1 and 3),
  response text not null default 'pending' check (response in ('pending', 'accepted', 'declined')),
  chosen_date date check (chosen_date is null or chosen_date = any (dates)),
  message text check (char_length(message) <= 1000),
  responded_at timestamptz
);

alter table public.invites enable row level security;

create policy "admins manage invites" on public.invites for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- past dinners
alter table public.events
  add column photos text[] not null default '{}',
  add column quotes jsonb not null default '[]'
    check (jsonb_typeof(quotes) = 'array' and jsonb_array_length(quotes) <= 3);

grant select (photos, quotes) on public.events to anon;

-- Event photos: anyone can view, only admins can upload or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admins manage event photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'event-photos' and public.is_admin())
  with check (bucket_id = 'event-photos' and public.is_admin());
