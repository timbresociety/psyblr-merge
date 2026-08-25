-- Migration 0003: V1 Canonical Product Contract Cutover
-- Supports 10 tiers (including X), Medal wallet without 100 cap, Dealer generated stock,
-- Campaign persistence, Defense snapshots & FIFO queue, Time Shield, and Release refund RPC.

-- 1. Tier Check Constraint Update (Includes 'X')
alter table public.summon_instances drop constraint if exists summon_instances_tier_check;
alter table public.summon_instances add constraint summon_instances_tier_check check (tier in ('F','E','D','C','B','A','S','SS','SSS','X'));

-- 2. Medal Wallet (Renaming balls -> medals and removing the <= 100 check constraint)
alter table public.spawn_machine_state drop constraint if exists spawn_machine_state_balls_check;
alter table public.spawn_machine_state add column if not exists medals integer not null default 100 check (medals >= 0);
alter table public.spawn_machine_state alter column balls set default 100;

-- 3. Profiles: Time Shield & Illuminati Upgrade
alter table public.profiles add column if not exists time_shield_expires_at timestamptz;
alter table public.profiles add column if not exists illuminati_upgraded boolean not null default false;
alter table public.profiles add column if not exists power_level integer not null default 0;

-- 4. Dealer State (100 Medals per 24 hours in 12 2-hour epochs, stock cap = 100)
create table if not exists public.dealer_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generated_stock smallint not null default 0 check (generated_stock between 0 and 100),
  last_accrual_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dealer_state enable row level security;
create policy "read own dealer state" on public.dealer_state for select using (auth.uid() = user_id);

-- 5. Global Daily Spawn Pool (Shared across all players for each date)
create table if not exists public.daily_spawn_pools (
  pool_date date primary key default current_date,
  pool_id text not null,
  slots jsonb not null, -- Array of 6 summon identities and probabilities summing to 100
  created_at timestamptz not null default now()
);
alter table public.daily_spawn_pools enable row level security;
create policy "read global daily pools" on public.daily_spawn_pools for select using (true);

-- 6. Campaign Progression Persistence
create table if not exists public.campaign_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  highest_level integer not null default 1,
  current_level integer not null default 1,
  formation jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.campaign_progress enable row level security;
create policy "read own campaign progress" on public.campaign_progress for select using (auth.uid() = user_id);

-- 7. Defense Snapshots & Defense Reward FIFO Queue
create table if not exists public.defense_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content_version text not null default '2026.09.14-content-1',
  fields jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.defense_snapshots enable row level security;
create policy "read own defense snapshot" on public.defense_snapshots for select using (auth.uid() = user_id);

create table if not exists public.defense_reward_fifo (
  id uuid primary key default gen_random_uuid(),
  defender_id uuid not null references auth.users(id) on delete cascade,
  summon_instance_id uuid not null references public.summon_instances(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.defense_reward_fifo enable row level security;
create policy "read own defense reward fifo" on public.defense_reward_fifo for select using (auth.uid() = defender_id);

-- 8. Authoritative Release Summon Function (50% F-equivalent refund rounded down)
create or replace function public.release_summon(p_summon_id uuid, p_action_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_summon public.summon_instances%rowtype;
  v_refund integer := 0;
  v_new_medals integer;
  v_cell record;
  v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_summon from public.summon_instances where id = p_summon_id and owner_id = v_user for update;
  if not found then raise exception 'Summon instance not found or not owned'; end if;

  select result into v_result from public.economy_actions where user_id = v_user and client_action_id = p_action_id and action_type = 'release-summon';
  if found then return v_result; end if;

  -- Compute 50% F-equivalent refund
  v_refund := case v_summon.tier
    when 'F' then 0
    when 'E' then 1
    when 'D' then 2
    when 'C' then 4
    when 'B' then 8
    when 'A' then 16
    when 'S' then 32
    when 'SS' then 64
    when 'SSS' then 128
    when 'X' then 256
    else 0
  end;

  select x, y into v_cell from public.camp_placements where summon_instance_id = p_summon_id and owner_id = v_user;
  delete from public.camp_placements where summon_instance_id = p_summon_id and owner_id = v_user;
  delete from public.summon_instances where id = p_summon_id and owner_id = v_user;

  update public.spawn_machine_state
  set medals = medals + v_refund, balls = balls + v_refund, updated_at = now()
  where user_id = v_user
  returning medals into v_new_medals;

  v_result := jsonb_build_object(
    'clientActionId', p_action_id,
    'releasedSummonInstanceId', p_summon_id,
    'tier', v_summon.tier,
    'medalsRefunded', v_refund,
    'newMedalBalance', v_new_medals,
    'freedCell', case when v_cell.x is not null then jsonb_build_object('x', v_cell.x, 'y', v_cell.y) else null end
  );

  insert into public.economy_actions(user_id, client_action_id, action_type, result)
  values(v_user, p_action_id, 'release-summon', v_result);

  return v_result;
end $$;
revoke all on function public.release_summon(uuid, uuid) from public;
grant execute on function public.release_summon(uuid, uuid) to authenticated;

-- 9. Authoritative Dealer Stock Collection Function
create or replace function public.collect_dealer_stock(p_action_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_dealer public.dealer_state%rowtype;
  v_current_medals integer;
  v_collected integer;
  v_new_medals integer;
  v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select medals into v_current_medals from public.spawn_machine_state where user_id = v_user for update;
  if v_current_medals is null then raise exception 'Wallet not found'; end if;

  if v_current_medals >= 100 then
    raise exception 'Wallet must be below 100 medals to collect dealer stock';
  end if;

  select * into v_dealer from public.dealer_state where user_id = v_user for update;
  if not found or v_dealer.generated_stock <= 0 then
    raise exception 'No dealer stock available to collect';
  end if;

  select result into v_result from public.economy_actions where user_id = v_user and client_action_id = p_action_id and action_type = 'collect-dealer-stock';
  if found then return v_result; end if;

  v_collected := v_dealer.generated_stock;

  update public.dealer_state
  set generated_stock = 0, last_accrual_at = now(), updated_at = now()
  where user_id = v_user;

  update public.spawn_machine_state
  set medals = medals + v_collected, balls = balls + v_collected, updated_at = now()
  where user_id = v_user
  returning medals into v_new_medals;

  v_result := jsonb_build_object(
    'clientActionId', p_action_id,
    'collectedStock', v_collected,
    'newMedalBalance', v_new_medals,
    'newDealerStock', 0
  );

  insert into public.economy_actions(user_id, client_action_id, action_type, result)
  values(v_user, p_action_id, 'collect-dealer-stock', v_result);

  return v_result;
end $$;
revoke all on function public.collect_dealer_stock(uuid) from public;
grant execute on function public.collect_dealer_stock(uuid) to authenticated;
