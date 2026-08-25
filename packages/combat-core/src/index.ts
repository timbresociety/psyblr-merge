import type {
  CombatCommand,
  CombatEvent,
  CombatSide,
  CombatSnapshot,
  SkillMechanics,
} from '@psyblr/contracts';

/** Combat is a fixed 100 ms simulation. Positions are integer thousandths of a board cell. */
export const SIM_TICK_MS = 100;
export const SIM_UNITS_PER_CELL = 1000;
export const OVERDRIVE_START_TICK = 200; // 20.0s
export const FINAL_COLLAPSE_START_TICK = 350; // 35.0s
export const MAX_COMBAT_TICKS = 450; // 45.0s hard safety cap

export type CombatPhase = 'NORMAL' | 'OVERDRIVE' | 'FINAL_COLLAPSE' | 'TERMINAL';

type StatusKind = 'slow' | 'stun' | 'taunt' | 'vulnerability';
type Status = { kind: StatusKind; expiresAtTick: number; value?: number; sourceId: string };

export type CombatUnitState = {
  id: string;
  definitionId: string;
  side: CombatSide;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  attacksPerSecond: number;
  range: number;
  moveSpeed: number;
  skill1Id: string | null;
  skill1: SkillMechanics | null;
  basicAttackDamagePct: number;
  skillPowerPct: number;
  statusDurationPct: number;
  x: number;
  z: number;
  nextAttackTick: number;
  nextSkillReadyTick: number;
  skillReadyAnnounced: boolean;
  targetId: string | null;
  shield: number;
  statuses: Status[];
  dead: boolean;
};

export type CombatState = {
  snapshot: CombatSnapshot;
  seed: number;
  tick: number;
  phase: CombatPhase;
  units: CombatUnitState[];
  events: CombatEvent[];
  ended: boolean;
  winner: CombatSide | 'draw' | null;
  acceptedCommands: CombatCommand[];
};

export type CombatStepResult = {
  state: CombatState;
  events: CombatEvent[];
  acceptedCommands: CombatCommand[];
};

const makeEvent = (
  tick: number,
  type: CombatEvent['type'],
  actorId: string | null,
  targetId: string | null,
  payload: Record<string, unknown> = {}
): CombatEvent => ({ tick, type, actorId, targetId, payload });

const ticksFor = (ms: number) => Math.max(1, Math.ceil(ms / SIM_TICK_MS));
const fixed = (cells: number) => Math.round(cells * SIM_UNITS_PER_CELL);
const alive = (unit: CombatUnitState) => !unit.dead && unit.hp > 0;
const enemySide = (side: CombatSide): CombatSide => (side === 'player' ? 'enemy' : 'player');
const distanceSquared = (a: CombatUnitState, b: CombatUnitState) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
const inRange = (a: CombatUnitState, b: CombatUnitState, range = a.range) => distanceSquared(a, b) <= fixed(range) ** 2;
const find = (state: CombatState, id: string) => state.units.find((unit) => unit.id === id);
const status = (unit: CombatUnitState, kind: StatusKind) => unit.statuses.find((entry) => entry.kind === kind);
const sortedAlive = (state: CombatState, side?: CombatSide) =>
  state.units.filter((unit) => alive(unit) && (!side || unit.side === side)).sort((a, b) => a.id.localeCompare(b.id));
const stunned = (unit: CombatUnitState) => Boolean(status(unit, 'stun'));

function getCombatPhase(tick: number): CombatPhase {
  if (tick >= MAX_COMBAT_TICKS) return 'TERMINAL';
  if (tick >= FINAL_COLLAPSE_START_TICK) return 'FINAL_COLLAPSE';
  if (tick >= OVERDRIVE_START_TICK) return 'OVERDRIVE';
  return 'NORMAL';
}

function chooseTarget(state: CombatState, unit: CombatUnitState, events: CombatEvent[]) {
  const taunt = status(unit, 'taunt');
  const taunter = taunt ? find(state, taunt.sourceId) : undefined;
  const candidates = taunter && alive(taunter) ? [taunter] : sortedAlive(state, enemySide(unit.side));
  const target = candidates.sort((a, b) => distanceSquared(unit, a) - distanceSquared(unit, b) || a.id.localeCompare(b.id))[0];
  if ((target?.id ?? null) !== unit.targetId) {
    unit.targetId = target?.id ?? null;
    events.push(makeEvent(state.tick, 'target_changed', unit.id, unit.targetId));
  }
  return target;
}

function moveToward(unit: CombatUnitState, target: CombatUnitState, distance: number) {
  const dx = target.x - unit.x;
  const dz = target.z - unit.z;
  if (!dx && !dz) return false;
  if (Math.abs(dx) >= Math.abs(dz)) unit.x += Math.sign(dx) * Math.min(distance, Math.abs(dx));
  else unit.z += Math.sign(dz) * Math.min(distance, Math.abs(dz));
  unit.x = Math.max(0, Math.min(7000, unit.x));
  unit.z = Math.max(0, Math.min(7000, unit.z));
  return true;
}

function applyStatus(
  state: CombatState,
  target: CombatUnitState,
  kind: StatusKind,
  sourceId: string,
  durationMs: number,
  value: number | undefined,
  events: CombatEvent[]
) {
  const source = find(state, sourceId);
  const durationTicks = ticksFor(Math.round(durationMs * (1 + (source?.statusDurationPct ?? 0))));
  const nextStatus: Status =
    value === undefined
      ? { kind, sourceId, expiresAtTick: state.tick + durationTicks }
      : { kind, sourceId, value, expiresAtTick: state.tick + durationTicks };
  target.statuses = target.statuses.filter((entry) => entry.kind !== kind).concat(nextStatus);
  events.push(makeEvent(state.tick, 'status_applied', sourceId, target.id, { status: kind, durationTicks, value: value ?? null }));
}

/** damage = max(1, round(raw * 100 / (100 + defense))); vulnerability increases raw damage first. */
function damage(
  state: CombatState,
  actor: CombatUnitState,
  target: CombatUnitState,
  raw: number,
  source: 'basic' | 'skill' | 'collapse',
  events: CombatEvent[]
) {
  if (!alive(target)) return;

  // Anti-stall Overdrive damage amplification
  let overdriveMultiplier = 1;
  if (state.tick >= OVERDRIVE_START_TICK) {
    const overdriveTicks = state.tick - OVERDRIVE_START_TICK;
    overdriveMultiplier = 1 + Math.min(1.5, overdriveTicks * 0.005); // Up to +150% damage
  }

  const vulnerable = status(target, 'vulnerability');
  const amplified = raw * overdriveMultiplier * (1 + (vulnerable?.value ?? 0) / 100);

  if (source === 'collapse') {
    // Unmitigable true damage: bypasses shields and armor completely
    const amount = Math.max(1, Math.round(amplified));
    target.hp = Math.max(0, target.hp - amount);
    events.push(makeEvent(state.tick, 'damage', actor.id, target.id, { amount, hpDamage: amount, source, vfx: 'collapse_damage', remainingHp: target.hp }));
    if (!target.hp && !target.dead) {
      target.dead = true;
      events.push(makeEvent(state.tick, 'death', target.id, null, { vfx: 'death' }));
    }
    return;
  }

  const amount = Math.max(1, Math.round((amplified * 100) / (100 + target.def)));
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  if (absorbed) events.push(makeEvent(state.tick, 'shield_changed', actor.id, target.id, { shield: target.shield, absorbed }));
  const hpDamage = amount - absorbed;
  target.hp = Math.max(0, target.hp - hpDamage);
  events.push(makeEvent(state.tick, 'damage', actor.id, target.id, { amount, hpDamage, source, vfx: 'damage', remainingHp: target.hp }));
  if (!target.hp && !target.dead) {
    target.dead = true;
    events.push(makeEvent(state.tick, 'death', target.id, null, { vfx: 'death' }));
  }
}

function castSkill(state: CombatState, actor: CombatUnitState, events: CombatEvent[]) {
  const skill = actor.skill1;
  if (!skill || !alive(actor) || stunned(actor) || state.tick < actor.nextSkillReadyTick) return false;
  const target = chooseTarget(state, actor, events);
  if (!target && skill.kind !== 'taunt_shield') return false;
  actor.skillReadyAnnounced = false;
  actor.nextSkillReadyTick = state.tick + ticksFor(skill.cooldownMs);
  events.push(makeEvent(state.tick, 'skill_cast', actor.id, target?.id ?? null, { skillId: actor.skill1Id, vfx: 'skill_cast', presentationKey: skill.presentationKey }));

  const enemies = sortedAlive(state, enemySide(actor.side));
  const radius = skill.radius ?? 0;
  const multiplier = skill.damageMultiplier ?? 0;

  if (skill.kind === 'line_damage' && target) {
    const dx = target.x - actor.x;
    const dz = target.z - actor.z;
    const length = dx * dx + dz * dz;
    const width = fixed(skill.lineWidth ?? 0.7);
    for (const enemy of enemies) {
      const ex = enemy.x - actor.x;
      const ez = enemy.z - actor.z;
      const projection = ex * dx + ez * dz;
      const cross = ex * dz - ez * dx;
      if (enemy.id === target.id || (projection >= 0 && projection <= length && cross * cross <= width * width * length)) {
        damage(state, actor, enemy, actor.atk * multiplier * (1 + actor.skillPowerPct), 'skill', events);
      }
    }
  } else if (skill.kind === 'aoe_slow' && target) {
    for (const enemy of enemies.filter((entry) => inRange(target, entry, radius))) {
      damage(state, actor, enemy, actor.atk * multiplier * (1 + actor.skillPowerPct), 'skill', events);
      applyStatus(state, enemy, 'slow', actor.id, skill.durationMs ?? 1, skill.slowPercent, events);
    }
  } else if (skill.kind === 'dash_aoe' && target) {
    moveToward(actor, target, fixed(skill.dashDistance ?? 1));
    events.push(makeEvent(state.tick, 'move', actor.id, target.id, { x: actor.x, z: actor.z, vfx: 'skill_cast' }));
    for (const enemy of enemies.filter((entry) => inRange(actor, entry, radius))) {
      damage(state, actor, enemy, actor.atk * multiplier * (1 + actor.skillPowerPct), 'skill', events);
    }
  } else if (skill.kind === 'taunt_shield') {
    // Overdrive anti-sustain: reduces shield gains by 50%
    const antiSustainMod = state.tick >= OVERDRIVE_START_TICK ? 0.5 : 1.0;
    const gained = Math.round(actor.atk * (skill.shieldMultiplier ?? 0) * (1 + actor.skillPowerPct) * antiSustainMod);
    actor.shield += gained;
    events.push(makeEvent(state.tick, 'shield_changed', actor.id, actor.id, { shield: actor.shield, gained, vfx: 'shield' }));
    for (const enemy of enemies.filter((entry) => inRange(actor, entry, radius))) {
      applyStatus(state, enemy, 'taunt', actor.id, skill.durationMs ?? 1, undefined, events);
    }
  } else if (skill.kind === 'mark_vulnerability' && target) {
    applyStatus(state, target, 'vulnerability', actor.id, skill.durationMs ?? 1, Math.round((skill.vulnerabilityPercent ?? 0) * (1 + actor.skillPowerPct)), events);
  } else if (skill.kind === 'stun' && target) {
    applyStatus(state, target, 'stun', actor.id, skill.durationMs ?? 1, undefined, events);
  }
  return true;
}

function expireStatuses(state: CombatState, events: CombatEvent[]) {
  for (const unit of state.units) {
    const expired = unit.statuses.filter((entry) => entry.expiresAtTick <= state.tick);
    unit.statuses = unit.statuses.filter((entry) => entry.expiresAtTick > state.tick);
    for (const entry of expired) {
      events.push(makeEvent(state.tick, 'status_removed', entry.sourceId, unit.id, { status: entry.kind }));
    }
  }
}

function applyFinalCollapse(state: CombatState, events: CombatEvent[]) {
  if (state.tick < FINAL_COLLAPSE_START_TICK || state.ended) return;

  // Pulse true collapse damage every 5 ticks (0.5s)
  if (state.tick % 5 === 0) {
    const collapseTicks = state.tick - FINAL_COLLAPSE_START_TICK;
    // Escalating percentage max HP true damage: starts at 3% per pulse, increases up to 15% per pulse
    const percentMaxHp = 0.03 + (collapseTicks / (MAX_COMBAT_TICKS - FINAL_COLLAPSE_START_TICK)) * 0.12;

    for (const unit of sortedAlive(state)) {
      const rawDamage = Math.max(1, Math.round(unit.maxHp * percentMaxHp));
      damage(state, unit, unit, rawDamage, 'collapse', events);
    }
  }
}

function finish(state: CombatState, events: CombatEvent[], timeout = false) {
  if (state.ended) return;
  const players = sortedAlive(state, 'player');
  const enemies = sortedAlive(state, 'enemy');
  let winner: CombatSide | 'draw' | null = null;

  if (timeout) {
    if (state.snapshot.mode === 'campaign') {
      // Campaign only clears on player victory. Timeout / non-win means failure.
      winner = 'enemy';
    } else {
      // Raid resolves based on total effective HP
      const total = (side: CombatSide) => sortedAlive(state, side).reduce((sum, u) => sum + u.hp + u.shield, 0);
      const p = total('player');
      const e = total('enemy');
      winner = p === e ? 'draw' : p > e ? 'player' : 'enemy';
    }
  } else if (!players.length || !enemies.length) {
    if (!players.length && !enemies.length) {
      winner = state.snapshot.mode === 'campaign' ? 'enemy' : 'draw';
    } else {
      winner = players.length ? 'player' : 'enemy';
    }
  }

  if (winner) {
    state.ended = true;
    state.winner = winner;
    events.push(makeEvent(state.tick, 'battle_end', null, null, { winner, reason: timeout ? 'timeout' : 'elimination' }));
  }
}

export function createCombatState(snapshot: CombatSnapshot, seed: number): CombatState {
  const events: CombatEvent[] = [];
  const state: CombatState = {
    snapshot: structuredClone(snapshot),
    seed,
    tick: 0,
    phase: 'NORMAL',
    events,
    ended: false,
    winner: null,
    acceptedCommands: [],
    units: snapshot.units
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((unit) => {
        const entry: CombatUnitState = {
          ...unit,
          basicAttackDamagePct: unit.basicAttackDamagePct ?? 0,
          skillPowerPct: unit.skillPowerPct ?? 0,
          statusDurationPct: unit.statusDurationPct ?? 0,
          maxHp: unit.hp,
          x: unit.spawnCell.x * 1000,
          z: unit.spawnCell.z * 1000,
          nextAttackTick: 0,
          nextSkillReadyTick: unit.skill1 ? ticksFor(unit.skill1.initialDelayMs) : Number.MAX_SAFE_INTEGER,
          skillReadyAnnounced: false,
          targetId: null,
          shield: 0,
          statuses: [],
          dead: false,
        };
        events.push(makeEvent(0, 'spawn', entry.id, null, { side: entry.side, definitionId: entry.definitionId, x: entry.x, z: entry.z }));
        return entry;
      }),
  };
  return state;
}

export function stepCombat(state: CombatState, commands: readonly CombatCommand[] = []): CombatStepResult {
  if (state.ended) return { state, events: [], acceptedCommands: [] };
  const events: CombatEvent[] = [];
  const accepted: CombatCommand[] = [];

  // Update anti-stall phase
  const nextPhase = getCombatPhase(state.tick);
  if (nextPhase !== state.phase) {
    state.phase = nextPhase;
    events.push(makeEvent(state.tick, 'combat_phase_changed', null, null, { phase: nextPhase }));
  }

  expireStatuses(state, events);

  // Apply Final Collapse true damage if reached
  applyFinalCollapse(state, events);

  // Process explicit commands
  for (const command of commands.filter((entry) => entry.issuedAtTick === state.tick).slice().sort((a, b) => a.actorId.localeCompare(b.actorId))) {
    const actor = find(state, command.actorId);
    if (actor && castSkill(state, actor, events)) {
      accepted.push(command);
      state.acceptedCommands.push(command);
    }
  }

  // Automatic battle loop for all alive units
  for (const unit of sortedAlive(state)) {
    if (stunned(unit)) continue;

    // Automatic skill cast if ready and not manually commanded
    if (unit.skill1 && state.tick >= unit.nextSkillReadyTick) {
      if (!unit.skillReadyAnnounced) {
        unit.skillReadyAnnounced = true;
        events.push(makeEvent(state.tick, 'skill_ready', unit.id, null, { skillId: unit.skill1Id, vfx: 'skill_ready' }));
      }
      castSkill(state, unit, events);
    }

    const target = chooseTarget(state, unit, events);
    if (!target) continue;

    if (!inRange(unit, target)) {
      const slow = status(unit, 'slow');
      const scale = slow ? Math.max(0, 100 - (slow.value ?? 0)) / 100 : 1;
      const step = Math.max(1, Math.round((fixed(unit.moveSpeed) * scale) / 10));
      if (moveToward(unit, target, step)) {
        events.push(makeEvent(state.tick, 'move', unit.id, target.id, { x: unit.x, z: unit.z }));
      }
    } else if (state.tick >= unit.nextAttackTick) {
      unit.nextAttackTick = state.tick + Math.max(1, Math.round(1000 / (unit.attacksPerSecond * SIM_TICK_MS)));
      events.push(makeEvent(state.tick, 'basic_attack', unit.id, target.id, { vfx: 'basic_hit' }));
      damage(state, unit, target, unit.atk * (1 + unit.basicAttackDamagePct), 'basic', events);
    }
  }

  finish(state, events);
  if (!state.ended && state.tick + 1 >= MAX_COMBAT_TICKS) {
    finish(state, events, true);
  }

  state.events.push(...events);
  state.tick++;
  return { state, events, acceptedCommands: accepted };
}

export function runCombat(snapshot: CombatSnapshot, seed: number, commandScript: readonly CombatCommand[] = []): CombatState {
  const state = createCombatState(snapshot, seed);
  while (!state.ended) stepCombat(state, commandScript);
  return state;
}

/** Stable Auto Cast command generation shared by asynchronous simulations. */
export function readySkillCommands(state: CombatState, sides: readonly CombatSide[] = ['player', 'enemy']): CombatCommand[] {
  const enabled = new Set(sides);
  return state.units
    .filter((unit) => enabled.has(unit.side) && !unit.dead && unit.skill1 && unit.nextSkillReadyTick <= state.tick)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((unit) => ({ type: 'cast_skill_1' as const, actorId: unit.id, issuedAtTick: state.tick }));
}

export function runCombatAutoCast(snapshot: CombatSnapshot, seed: number, sides: readonly CombatSide[] = ['player', 'enemy']): CombatState {
  const state = createCombatState(snapshot, seed);
  while (!state.ended) stepCombat(state, readySkillCommands(state, sides));
  return state;
}
