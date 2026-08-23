import type { CombatCommand, CombatEvent, CombatSide, CombatSnapshot, SkillMechanics } from '@psyblr/contracts';

/** Combat is a fixed 100 ms simulation. Positions are integer thousandths of a board cell. */
export const SIM_TICK_MS = 100;
export const SIM_UNITS_PER_CELL = 1000;
export const MAX_COMBAT_TICKS = 450;
type StatusKind = 'slow' | 'stun' | 'taunt' | 'vulnerability';
type Status = { kind: StatusKind; expiresAtTick: number; value?: number; sourceId: string };
export type CombatUnitState = { id:string; definitionId:string; side:CombatSide; hp:number; maxHp:number; atk:number; def:number; attacksPerSecond:number; range:number; moveSpeed:number; skill1Id:string|null; skill1:SkillMechanics|null; x:number; z:number; nextAttackTick:number; nextSkillReadyTick:number; skillReadyAnnounced:boolean; targetId:string|null; shield:number; statuses:Status[]; dead:boolean };
export type CombatState = { snapshot:CombatSnapshot; seed:number; tick:number; units:CombatUnitState[]; events:CombatEvent[]; ended:boolean; winner:CombatSide|'draw'|null; acceptedCommands:CombatCommand[] };
export type CombatStepResult = { state:CombatState; events:CombatEvent[]; acceptedCommands:CombatCommand[] };

const makeEvent = (tick:number, type:CombatEvent['type'], actorId:string|null, targetId:string|null, payload:Record<string, unknown> = {}):CombatEvent => ({ tick, type, actorId, targetId, payload });
const ticksFor = (ms:number) => Math.max(1, Math.ceil(ms / SIM_TICK_MS));
const fixed = (cells:number) => Math.round(cells * SIM_UNITS_PER_CELL);
const alive = (unit:CombatUnitState) => !unit.dead && unit.hp > 0;
const enemySide = (side:CombatSide):CombatSide => side === 'player' ? 'enemy' : 'player';
const distanceSquared = (a:CombatUnitState,b:CombatUnitState) => (a.x-b.x)**2 + (a.z-b.z)**2;
const inRange = (a:CombatUnitState,b:CombatUnitState,range = a.range) => distanceSquared(a,b) <= fixed(range)**2;
const find = (state:CombatState,id:string) => state.units.find(unit => unit.id === id);
const status = (unit:CombatUnitState,kind:StatusKind) => unit.statuses.find(entry => entry.kind === kind);
const sortedAlive = (state:CombatState, side?:CombatSide) => state.units.filter(unit => alive(unit) && (!side || unit.side === side)).sort((a,b) => a.id.localeCompare(b.id));
const stunned = (unit:CombatUnitState) => Boolean(status(unit,'stun'));

function chooseTarget(state:CombatState, unit:CombatUnitState, events:CombatEvent[]) {
  const taunt = status(unit,'taunt');
  const taunter = taunt ? find(state,taunt.sourceId) : undefined;
  const candidates = taunter && alive(taunter) ? [taunter] : sortedAlive(state,enemySide(unit.side));
  const target = candidates.sort((a,b) => distanceSquared(unit,a)-distanceSquared(unit,b) || a.id.localeCompare(b.id))[0];
  if ((target?.id ?? null) !== unit.targetId) { unit.targetId = target?.id ?? null; events.push(makeEvent(state.tick,'target_changed',unit.id,unit.targetId)); }
  return target;
}
function moveToward(unit:CombatUnitState,target:CombatUnitState,distance:number) {
  const dx=target.x-unit.x, dz=target.z-unit.z;
  if (!dx && !dz) return false;
  if (Math.abs(dx) >= Math.abs(dz)) unit.x += Math.sign(dx)*Math.min(distance,Math.abs(dx)); else unit.z += Math.sign(dz)*Math.min(distance,Math.abs(dz));
  unit.x=Math.max(0,Math.min(7000,unit.x)); unit.z=Math.max(0,Math.min(7000,unit.z)); return true;
}
function applyStatus(state:CombatState,target:CombatUnitState,kind:StatusKind,sourceId:string,durationMs:number,value:number|undefined,events:CombatEvent[]) {
  const durationTicks=ticksFor(durationMs);
  const nextStatus:Status = value === undefined ? {kind,sourceId,expiresAtTick:state.tick+durationTicks} : {kind,sourceId,value,expiresAtTick:state.tick+durationTicks};
  target.statuses=target.statuses.filter(entry=>entry.kind!==kind).concat(nextStatus);
  events.push(makeEvent(state.tick,'status_applied',sourceId,target.id,{status:kind,durationTicks,value:value ?? null}));
}
/** damage = max(1, round(raw * 100 / (100 + defense))); vulnerability increases raw damage first. */
function damage(state:CombatState,actor:CombatUnitState,target:CombatUnitState,raw:number,source:'basic'|'skill',events:CombatEvent[]) {
  if (!alive(target)) return;
  const vulnerable=status(target,'vulnerability');
  const amplified=raw*(1+(vulnerable?.value ?? 0)/100);
  const amount=Math.max(1,Math.round(amplified*100/(100+target.def)));
  const absorbed=Math.min(target.shield,amount); target.shield-=absorbed;
  if (absorbed) events.push(makeEvent(state.tick,'shield_changed',actor.id,target.id,{shield:target.shield,absorbed}));
  const hpDamage=amount-absorbed; target.hp=Math.max(0,target.hp-hpDamage);
  events.push(makeEvent(state.tick,'damage',actor.id,target.id,{amount,hpDamage,source,vfx:'damage',remainingHp:target.hp}));
  if (!target.hp && !target.dead) { target.dead=true; events.push(makeEvent(state.tick,'death',target.id,null,{vfx:'death'})); }
}
function castSkill(state:CombatState,actor:CombatUnitState,events:CombatEvent[]) {
  const skill=actor.skill1;
  if (!skill || !alive(actor) || stunned(actor) || state.tick<actor.nextSkillReadyTick) return false;
  const target=chooseTarget(state,actor,events);
  if (!target && skill.kind!=='taunt_shield') return false;
  actor.skillReadyAnnounced=false; actor.nextSkillReadyTick=state.tick+ticksFor(skill.cooldownMs);
  events.push(makeEvent(state.tick,'skill_cast',actor.id,target?.id ?? null,{skillId:actor.skill1Id,vfx:'skill_cast',presentationKey:skill.presentationKey}));
  const enemies=sortedAlive(state,enemySide(actor.side)), radius=skill.radius ?? 0, multiplier=skill.damageMultiplier ?? 0;
  if (skill.kind==='line_damage' && target) {
    const dx=target.x-actor.x,dz=target.z-actor.z,length=dx*dx+dz*dz,width=fixed(skill.lineWidth ?? .7);
    for (const enemy of enemies) { const ex=enemy.x-actor.x,ez=enemy.z-actor.z,projection=ex*dx+ez*dz,cross=ex*dz-ez*dx; if (enemy.id===target.id || (projection>=0 && projection<=length && cross*cross<=width*width*length)) damage(state,actor,enemy,actor.atk*multiplier,'skill',events); }
  } else if (skill.kind==='aoe_slow' && target) {
    for (const enemy of enemies.filter(entry=>inRange(target,entry,radius))) { damage(state,actor,enemy,actor.atk*multiplier,'skill',events); applyStatus(state,enemy,'slow',actor.id,skill.durationMs ?? 1,skill.slowPercent,events); }
  } else if (skill.kind==='dash_aoe' && target) {
    moveToward(actor,target,fixed(skill.dashDistance ?? 1)); events.push(makeEvent(state.tick,'move',actor.id,target.id,{x:actor.x,z:actor.z,vfx:'skill_cast'}));
    for (const enemy of enemies.filter(entry=>inRange(actor,entry,radius))) damage(state,actor,enemy,actor.atk*multiplier,'skill',events);
  } else if (skill.kind==='taunt_shield') {
    const gained=Math.round(actor.atk*(skill.shieldMultiplier ?? 0)); actor.shield+=gained; events.push(makeEvent(state.tick,'shield_changed',actor.id,actor.id,{shield:actor.shield,gained,vfx:'shield'}));
    for (const enemy of enemies.filter(entry=>inRange(actor,entry,radius))) applyStatus(state,enemy,'taunt',actor.id,skill.durationMs ?? 1,undefined,events);
  } else if (skill.kind==='mark_vulnerability' && target) applyStatus(state,target,'vulnerability',actor.id,skill.durationMs ?? 1,skill.vulnerabilityPercent,events);
  else if (skill.kind==='stun' && target) applyStatus(state,target,'stun',actor.id,skill.durationMs ?? 1,undefined,events);
  return true;
}
function expireStatuses(state:CombatState,events:CombatEvent[]) { for (const unit of state.units) { const expired=unit.statuses.filter(entry=>entry.expiresAtTick<=state.tick); unit.statuses=unit.statuses.filter(entry=>entry.expiresAtTick>state.tick); for (const entry of expired) events.push(makeEvent(state.tick,'status_removed',entry.sourceId,unit.id,{status:entry.kind})); } }
function finish(state:CombatState,events:CombatEvent[],timeout=false) {
  if (state.ended) return;
  const players=sortedAlive(state,'player'), enemies=sortedAlive(state,'enemy'); let winner:CombatSide|'draw'|null=null;
  if (timeout) { const total=(side:CombatSide)=>sortedAlive(state,side).reduce((sum,u)=>sum+u.hp+u.shield,0); const p=total('player'),e=total('enemy'); winner=p===e?'draw':p>e?'player':'enemy'; }
  else if (!players.length || !enemies.length) winner=players.length===enemies.length?'draw':players.length?'player':'enemy';
  if (winner) { state.ended=true; state.winner=winner; events.push(makeEvent(state.tick,'battle_end',null,null,{winner,reason:timeout?'timeout':'elimination'})); }
}

export function createCombatState(snapshot:CombatSnapshot,seed:number):CombatState {
  const events:CombatEvent[]=[];
  const state:CombatState={snapshot:structuredClone(snapshot),seed,tick:0,events,ended:false,winner:null,acceptedCommands:[],units:snapshot.units.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(unit=>{
    const entry:CombatUnitState={...unit,maxHp:unit.hp,x:unit.spawnCell.x*1000,z:unit.spawnCell.z*1000,nextAttackTick:0,nextSkillReadyTick:unit.skill1?ticksFor(unit.skill1.initialDelayMs):Number.MAX_SAFE_INTEGER,skillReadyAnnounced:false,targetId:null,shield:0,statuses:[],dead:false};
    events.push(makeEvent(0,'spawn',entry.id,null,{side:entry.side,definitionId:entry.definitionId,x:entry.x,z:entry.z})); return entry;
  })}; return state;
}
export function stepCombat(state:CombatState,commands:readonly CombatCommand[]=[]):CombatStepResult {
  if (state.ended) return {state,events:[],acceptedCommands:[]}; const events:CombatEvent[]=[]; const accepted:CombatCommand[]=[]; expireStatuses(state,events);
  for (const command of commands.filter(entry=>entry.issuedAtTick===state.tick).slice().sort((a,b)=>a.actorId.localeCompare(b.actorId))) { const actor=find(state,command.actorId); if (actor && castSkill(state,actor,events)) { accepted.push(command); state.acceptedCommands.push(command); } }
  for (const unit of sortedAlive(state)) { if (stunned(unit)) continue; if (unit.skill1 && state.tick>=unit.nextSkillReadyTick && !unit.skillReadyAnnounced) { unit.skillReadyAnnounced=true; events.push(makeEvent(state.tick,'skill_ready',unit.id,null,{skillId:unit.skill1Id,vfx:'skill_ready'})); }
    const target=chooseTarget(state,unit,events); if (!target) continue; if (!inRange(unit,target)) { const slow=status(unit,'slow'); const scale=slow?Math.max(0,100-(slow.value ?? 0))/100:1; const step=Math.max(1,Math.round(fixed(unit.moveSpeed)*scale/10)); if(moveToward(unit,target,step)) events.push(makeEvent(state.tick,'move',unit.id,target.id,{x:unit.x,z:unit.z})); }
    else if (state.tick>=unit.nextAttackTick) { unit.nextAttackTick=state.tick+Math.max(1,Math.round(1000/(unit.attacksPerSecond*SIM_TICK_MS))); events.push(makeEvent(state.tick,'basic_attack',unit.id,target.id,{vfx:'basic_hit'})); damage(state,unit,target,unit.atk,'basic',events); }
  }
  finish(state,events); if (!state.ended && state.tick+1>=MAX_COMBAT_TICKS) finish(state,events,true); state.events.push(...events); state.tick++; return {state,events,acceptedCommands:accepted};
}
export function runCombat(snapshot:CombatSnapshot,seed:number,commandScript:readonly CombatCommand[]=[]):CombatState { const state=createCombatState(snapshot,seed); while(!state.ended) stepCombat(state,commandScript); return state; }
