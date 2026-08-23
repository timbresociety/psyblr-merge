create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tutorial_step text not null default 'campaign_open_inventory',
  tutorial_complete boolean not null default false,
  auto_cast boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.summon_instances (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  summon_def_id text not null, tier text not null check (tier in ('F','E','D','C','B','A','S','SS','SSS')),
  acquired_via text not null default 'tutorial', created_at timestamptz not null default now()
);
create index summon_instances_owner_idx on public.summon_instances(owner_id);

create table public.camp_placements (
  owner_id uuid not null references auth.users(id) on delete cascade,
  summon_instance_id uuid primary key references public.summon_instances(id) on delete cascade,
  x smallint not null check (x between 0 and 5), y smallint not null check (y between 0 and 5),
  unique(owner_id,x,y)
);

create table public.spawn_machine_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balls smallint not null default 100 check (balls between 0 and 100),
  refill_at timestamptz not null, shield_blob_hits integer not null default 0, tier_blob_hits integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.daily_spawn_pool (
  user_id uuid not null references auth.users(id) on delete cascade, reset_key date not null,
  slot smallint not null check (slot between 0 and 5), summon_def_id text not null,
  probability smallint not null check (probability > 0 and probability <= 100),
  primary key(user_id,reset_key,slot)
);

create table public.economy_actions (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_action_id uuid not null, action_type text not null, result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), primary key(user_id,client_action_id)
);

create table public.merge_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  parent_a uuid not null, parent_b uuid not null, result_summon uuid not null,
  from_tier text not null, to_tier text not null, client_action_id uuid not null,
  created_at timestamptz not null default now(), unique(user_id,client_action_id)
);

create table public.raid_defense (
  user_id uuid not null references auth.users(id) on delete cascade,
  round_size smallint not null check (round_size in (1,3,6)), slot smallint not null,
  summon_instance_id uuid not null references public.summon_instances(id) on delete cascade,
  primary key(user_id,round_size,slot), unique(user_id,round_size,summon_instance_id)
);

create table public.raid_matches (
  id uuid primary key default gen_random_uuid(), attacker_id uuid not null references auth.users(id), defender_id uuid not null references auth.users(id),
  seed bigint not null, content_version text not null, state text not null default 'created' check(state in ('created','resolved','steal_claimed')),
  result text check(result in ('win','draw','loss')), attacker_snapshot jsonb not null, defender_snapshot jsonb not null,
  created_at timestamptz not null default now(), resolved_at timestamptz
);

create table public.raid_rounds (
  raid_id uuid not null references public.raid_matches(id) on delete cascade, round_index smallint not null check(round_index between 0 and 2),
  round_size smallint not null check(round_size in (1,3,6)), outcome text not null check(outcome in ('win','draw','loss')),
  combat_log jsonb not null, primary key(raid_id,round_index)
);

create table public.raid_steals (
  raid_id uuid primary key references public.raid_matches(id) on delete cascade,
  from_user uuid not null references auth.users(id), to_user uuid not null references auth.users(id), summon_instance_id uuid not null references public.summon_instances(id),
  claimed_at timestamptz not null default now()
);

create table public.player_buildings (
  user_id uuid not null references auth.users(id) on delete cascade, building_slot text not null, building_def_id text not null, level integer not null default 1,
  state jsonb not null default '{}'::jsonb, primary key(user_id,building_slot)
);

alter table public.profiles enable row level security;
alter table public.summon_instances enable row level security;
alter table public.camp_placements enable row level security;
alter table public.spawn_machine_state enable row level security;
alter table public.daily_spawn_pool enable row level security;
alter table public.raid_defense enable row level security;
alter table public.raid_matches enable row level security;
alter table public.raid_rounds enable row level security;
alter table public.player_buildings enable row level security;

create policy "read own profile" on public.profiles for select using (auth.uid()=user_id);
create policy "read own summons" on public.summon_instances for select using (auth.uid()=owner_id);
create policy "read own camp" on public.camp_placements for select using (auth.uid()=owner_id);
create policy "read own machine" on public.spawn_machine_state for select using (auth.uid()=user_id);
create policy "read own pool" on public.daily_spawn_pool for select using (auth.uid()=user_id);
create policy "read own defense" on public.raid_defense for select using (auth.uid()=user_id);
create policy "read involved raids" on public.raid_matches for select using (auth.uid()=attacker_id or auth.uid()=defender_id);
create policy "read own buildings" on public.player_buildings for select using (auth.uid()=user_id);

-- Intentionally no direct client INSERT/UPDATE/DELETE policies for authoritative economy tables.
-- Edge Functions/RPCs use authenticated identity + privileged transaction logic.
