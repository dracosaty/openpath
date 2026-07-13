-- OpenPath — referrals (virality) + personalization profile.
-- profiles: one row per user, holding their referral code, earned bonus quota,
-- plan tier, and personalization (resume/background context + language).

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  referral_code text unique not null,
  referred_by   uuid references auth.users (id),
  bonus_daily   integer not null default 0,        -- extra generations/day earned via referrals
  plan          text not null default 'free_forever',
  context       text,                               -- resume / background for tailoring (optional)
  language      text not null default 'English',
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile (with a deterministic, unique referral code) on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, referral_code)
  values (new.id, upper(substr(md5(new.id::text), 1, 8)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Referrals: a user can be referred at most once (referee_id is the PK).
create table if not exists public.referrals (
  referee_id  uuid primary key references auth.users (id) on delete cascade,
  referrer_id uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);
alter table public.referrals enable row level security;
-- No client policies; only the SECURITY DEFINER function below writes here.

-- Redeem a referral code: grants bonus daily quota to BOTH parties, once.
-- SECURITY DEFINER so it can update the referrer's profile (which the caller
-- otherwise cannot touch under RLS).
create or replace function public.redeem_referral(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_referrer uuid;
  v_bonus integer := 10;
begin
  if v_me is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;
  if exists (select 1 from public.referrals where referee_id = v_me) then
    return json_build_object('ok', false, 'reason', 'already_referred');
  end if;
  select id into v_referrer from public.profiles where referral_code = upper(p_code);
  if v_referrer is null then
    return json_build_object('ok', false, 'reason', 'invalid_code');
  end if;
  if v_referrer = v_me then
    return json_build_object('ok', false, 'reason', 'self');
  end if;

  insert into public.referrals (referee_id, referrer_id) values (v_me, v_referrer);
  update public.profiles set referred_by = v_referrer, bonus_daily = bonus_daily + v_bonus where id = v_me;
  update public.profiles set bonus_daily = bonus_daily + v_bonus where id = v_referrer;

  return json_build_object('ok', true, 'bonus', v_bonus);
end;
$$;

-- Referral stats for the invite panel (count + earned bonus), own data only.
create or replace function public.my_referral_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_me uuid := auth.uid(); v_count int; v_bonus int; v_code text;
begin
  if v_me is null then return json_build_object('count', 0, 'bonus', 0); end if;
  select count(*) into v_count from public.referrals where referrer_id = v_me;
  select bonus_daily, referral_code into v_bonus, v_code from public.profiles where id = v_me;
  return json_build_object('count', coalesce(v_count,0), 'bonus', coalesce(v_bonus,0), 'code', v_code);
end;
$$;
