-- OpenPath — sharing / virality: make a roadmap publicly viewable by link.
-- A roadmap is private by default; the owner flips is_public to share it.
-- Public reads go through the get-public-roadmap function (service role), which
-- only ever returns rows where is_public = true and strips owner/user fields —
-- so we do NOT open a broad anon SELECT policy on the table.

alter table public.roadmaps
  add column if not exists is_public boolean not null default false;

-- Lightweight share analytics so we can measure the viral loop (view counts).
create table if not exists public.roadmap_shares (
  roadmap_id  uuid primary key references public.roadmaps (id) on delete cascade,
  views       integer not null default 0,
  creates     integer not null default 0,   -- roadmaps generated from this share
  updated_at  timestamptz not null default now()
);

alter table public.roadmap_shares enable row level security;
-- Written only by the service role (functions); no public policies.

-- Atomic counter bump used by the share function.
create or replace function public.bump_share_metric(
  p_roadmap_id uuid,
  p_metric text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.roadmap_shares (roadmap_id, views, creates)
  values (p_roadmap_id,
          case when p_metric = 'view' then 1 else 0 end,
          case when p_metric = 'create' then 1 else 0 end)
  on conflict (roadmap_id) do update
    set views = public.roadmap_shares.views + case when p_metric = 'view' then 1 else 0 end,
        creates = public.roadmap_shares.creates + case when p_metric = 'create' then 1 else 0 end,
        updated_at = now();
end;
$$;
