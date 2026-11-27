-- Students can pay by Zelle (a phone number or email) instead of Venmo.
-- When a dinner has both, the emails show Zelle.
alter table public.events
  add column zelle text check (char_length(zelle) between 3 and 80);
