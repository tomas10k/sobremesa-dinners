-- Public event pages: a topic description, the confirmed speakers' company and role,
-- and their name and photo once they have said we can show them.

alter table public.events
  add column description_es text check (char_length(description_es) <= 2000),
  add column description_en text check (char_length(description_en) <= 2000);

-- Visitors can read the description, and how many speaker seats a dinner has.
grant select (description_es, description_en, speakers_needed) on public.events to anon;

alter table public.speakers
  add column public_profile boolean not null default false,  -- agreed to show name and photo
  add column photo_url text;

-- Speakers the team adds by hand may not have shared these yet.
alter table public.speakers
  alter column email drop not null,
  alter column linkedin_url drop not null;

-- Confirmed speakers of published dinners. Name and photo only with consent;
-- nothing else about the speaker leaves the database.
create or replace function public.public_event_speakers()
returns table (event_id uuid, company text, role text, name text, photo_url text)
language sql
stable
security definer
set search_path = public
as $$
  select es.event_id, s.company, s.role,
         case when s.public_profile then s.name end,
         case when s.public_profile then s.photo_url end
  from public.event_speakers es
  join public.speakers s on s.id = es.speaker_id
  join public.events e on e.id = es.event_id
  where es.status = 'confirmed' and e.status in ('upcoming', 'past')
  order by es.created_at, s.id;
$$;

revoke execute on function public.public_event_speakers() from public;
grant execute on function public.public_event_speakers() to anon, authenticated;

-- Speaker photos: anyone can view (public bucket), only admins can upload or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speaker-photos', 'speaker-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admins manage speaker photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'speaker-photos' and public.is_admin())
  with check (bucket_id = 'speaker-photos' and public.is_admin());
