-- OpenPath — spaced-repetition review.
-- Quiz questions a learner answers become review items, re-surfaced on an SM-2
-- schedule. Signed-in users persist here (cross-device); signed-out users keep
-- the same shape in localStorage. RLS: a user only ever touches their own rows.

create table if not exists public.review_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  roadmap_id    uuid references public.roadmaps (id) on delete set null,
  node_id       text not null,
  node_title    text,
  question      text not null,
  options       jsonb not null default '[]'::jsonb,
  answer        text not null,
  ease          real not null default 2.5,
  interval_days integer not null default 0,
  repetitions   integer not null default 0,
  due_at        timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at    timestamptz not null default now(),
  -- one card per (user, node, question) so re-answering doesn't duplicate
  unique (user_id, node_id, question)
);

create index if not exists review_items_due_idx on public.review_items (user_id, due_at);

alter table public.review_items enable row level security;

create policy "review: select own" on public.review_items
  for select using (auth.uid() = user_id);
create policy "review: insert own" on public.review_items
  for insert with check (auth.uid() = user_id);
create policy "review: update own" on public.review_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "review: delete own" on public.review_items
  for delete using (auth.uid() = user_id);
