-- OpenPath — Step 4/5: user persistence + feedback.
-- These tables are owned by end users and accessed from the browser with the
-- anon key + the user's session, so each has Row-Level Security policies keyed
-- on auth.uid(). A user can only ever see/modify their own rows.

-- ── Saved roadmaps ───────────────────────────────────────────────────
create table if not exists public.roadmaps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  topic       text,
  title       text,
  data        jsonb not null,           -- the full Roadmap object
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists roadmaps_user_idx on public.roadmaps (user_id, updated_at desc);

alter table public.roadmaps enable row level security;

create policy "roadmaps: select own" on public.roadmaps
  for select using (auth.uid() = user_id);
create policy "roadmaps: insert own" on public.roadmaps
  for insert with check (auth.uid() = user_id);
create policy "roadmaps: update own" on public.roadmaps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "roadmaps: delete own" on public.roadmaps
  for delete using (auth.uid() = user_id);

-- ── Per-node progress ────────────────────────────────────────────────
-- One row per completed node. Absence = not complete.
create table if not exists public.progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  roadmap_id   uuid not null references public.roadmaps (id) on delete cascade,
  node_id      text not null,
  completed_at timestamptz not null default now(),
  primary key (roadmap_id, node_id)
);
create index if not exists progress_user_idx on public.progress (user_id);

alter table public.progress enable row level security;

create policy "progress: select own" on public.progress
  for select using (auth.uid() = user_id);
create policy "progress: insert own" on public.progress
  for insert with check (auth.uid() = user_id);
create policy "progress: delete own" on public.progress
  for delete using (auth.uid() = user_id);

-- ── Per-node feedback ("report issue / inaccurate") ─────────────────
-- Captured from day one so we can spot bad AI curriculum. Users insert their
-- own rows; reading is reserved for the service role (admin), so there is no
-- select policy here.
create table if not exists public.node_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  roadmap_id  uuid references public.roadmaps (id) on delete set null,
  node_id     text,
  node_title  text,
  path_title  text,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists node_feedback_created_idx on public.node_feedback (created_at desc);

alter table public.node_feedback enable row level security;

create policy "node_feedback: insert own" on public.node_feedback
  for insert with check (auth.uid() = user_id);
