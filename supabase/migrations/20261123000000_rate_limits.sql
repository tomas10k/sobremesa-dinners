-- Rate limiting for the public forms: hits per key (form + hashed visitor IP)
-- per time window. Only the server, with the secret key, can touch it.

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_start on public.rate_limits (window_start);

-- RLS on and no policies: invisible to visitors and admins alike.
alter table public.rate_limits enable row level security;

-- Counts one hit and says whether it's still within `p_max` for the current window.
create or replace function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n int;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  delete from rate_limits where window_start < now() - interval '1 day';
  return n <= p_max;
end;
$$;

revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
