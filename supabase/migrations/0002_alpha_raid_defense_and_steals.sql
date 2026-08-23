-- Final alpha Raid contract.  0001 shipped an obsolete 1/3/6 constraint;
-- migrate rather than rewriting history so deployed databases are explicit.
alter table public.raid_defense drop constraint if exists raid_defense_round_size_check;
alter table public.raid_defense add constraint raid_defense_round_size_check check (round_size in (2,4,6));
alter table public.raid_defense add column if not exists x smallint;
alter table public.raid_defense add column if not exists z smallint;
alter table public.raid_defense add constraint raid_defense_player_cells check (x between 0 and 7 and z between 4 and 7);
alter table public.raid_defense add constraint raid_defense_unique_cell unique (user_id,round_size,x,z);
alter table public.raid_defense add column if not exists content_version text not null default 'alpha-1';

alter table public.raid_rounds drop constraint if exists raid_rounds_round_size_check;
alter table public.raid_rounds add constraint raid_rounds_round_size_check check (round_size in (2,4,6));
alter table public.raid_rounds add column if not exists attacker_formation jsonb not null default '[]'::jsonb;
alter table public.raid_rounds add column if not exists defender_formation jsonb not null default '[]'::jsonb;
alter table public.raid_matches alter column seed type text using seed::text;
alter table public.raid_matches add column if not exists claim_consumed boolean not null default false;

alter table public.raid_steals enable row level security;
create policy "read involved steals" on public.raid_steals for select using (auth.uid()=from_user or auth.uid()=to_user);

-- Called only by the service-role Edge Function after it has authenticated the
-- caller. FOR UPDATE makes duplicate client retries and concurrent tabs safe.
create or replace function public.claim_raid_steal(p_raid_id uuid, p_target uuid, p_action_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_attacker uuid := auth.uid(); v_match public.raid_matches%rowtype; v_cell record; v_result jsonb;
begin
  if v_attacker is null then raise exception 'Authentication required'; end if;
  select * into v_match from public.raid_matches where id=p_raid_id for update;
  if not found or v_match.attacker_id <> v_attacker then raise exception 'Raid claim unavailable'; end if;
  if v_match.result <> 'win' then raise exception 'Only a winning Raid has a claim'; end if;
  select result into v_result from public.economy_actions where user_id=v_attacker and client_action_id=p_action_id and action_type='claim-raid-steal';
  if found then return v_result; end if;
  if v_match.claim_consumed then raise exception 'Raid claim already consumed'; end if;
  perform 1 from public.summon_instances where id=p_target and owner_id=v_match.defender_id for update;
  if not found then raise exception 'Target no longer belongs to this defender'; end if;
  perform 1 from public.camp_placements where summon_instance_id=p_target and owner_id=v_match.defender_id and y > 0 for update;
  if not found then raise exception 'PROTECTED BY ILLUMINATI'; end if;
  select x,y into v_cell from (select x,y from generate_series(0,5) x cross join generate_series(1,5) y) cells where not exists (select 1 from public.camp_placements c where c.owner_id=v_attacker and c.x=cells.x and c.y=cells.y) order by y,x limit 1;
  if v_cell is null then raise exception 'BATTLE CAMP FULL — MAKE SPACE BEFORE CLAIMING'; end if;
  update public.summon_instances set owner_id=v_attacker where id=p_target;
  update public.camp_placements set owner_id=v_attacker,x=v_cell.x,y=v_cell.y where summon_instance_id=p_target;
  insert into public.raid_steals(raid_id,from_user,to_user,summon_instance_id) values(p_raid_id,v_match.defender_id,v_attacker,p_target);
  update public.raid_matches set claim_consumed=true,state='steal_claimed' where id=p_raid_id;
  v_result := jsonb_build_object('raidId',p_raid_id,'targetSummonInstanceId',p_target,'destination',jsonb_build_object('x',v_cell.x,'y',v_cell.y),'completed',true);
  insert into public.economy_actions(user_id,client_action_id,action_type,result) values(v_attacker,p_action_id,'claim-raid-steal',v_result);
  return v_result;
end $$;
revoke all on function public.claim_raid_steal(uuid,uuid,uuid) from public;
grant execute on function public.claim_raid_steal(uuid,uuid,uuid) to authenticated;
