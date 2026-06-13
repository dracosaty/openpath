-- OpenPath — Step 3: AI response cache + rate limiting.
-- Both tables are written ONLY by the Netlify Functions using the service-role
-- key, so Row-Level Security is enabled with no public policies (deny-all to
-- the anon/auth clients). Run this in the Supabase SQL editor or via the CLI.

-- ── AI response cache ────────────────────────────────────────────────
-- key = sha256(flow : model : promptVersion : normalizedSubject : profileFingerprint)
-- Identical roadmap/lesson/deeper requests are served from here, no model call.
create table if not exists public.ai_cache (
  key         text primary key,
  flow        text not null,
  value       jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists ai_cache_flow_idx on public.ai_cache (flow);
create index if not exists ai_cache_created_idx on public.ai_cache (created_at);

alter table public.ai_cache enable row level security;
-- No policies => only the service role (which bypasses RLS) can read/write.

-- ── Rate limiting (fixed-window counters) ────────────────────────────
-- identifier encodes bucket + scope, e.g. 'ip:1.2.3.4:hour'. One row per
-- (identifier) holding the current window start and count.
create table if not exists public.rate_limits (
  identifier   text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 0
);

alter table public.rate_limits enable row level security;

-- Atomic check-and-increment. Returns TRUE if the request is allowed (i.e. the
-- post-increment count is within p_limit), FALSE if the limit is exceeded.
-- Fixed window: when the stored window has expired, it resets to 1.
create or replace function public.check_rate_limit(
  p_id text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_now timestamptz := now();
begin
  insert into public.rate_limits (identifier, window_start, count)
  values (p_id, v_now, 1)
  on conflict (identifier) do update
    set count = case
          when public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          then 1
          else public.rate_limits.count + 1
        end,
        window_start = case
          when public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          then v_now
          else public.rate_limits.window_start
        end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Optional housekeeping you can schedule later (pg_cron) to keep tables small:
--   delete from public.ai_cache    where created_at  < now() - interval '90 days';
--   delete from public.rate_limits where window_start < now() - interval '1 day';
