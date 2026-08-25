import { describe, expect, it } from 'vitest';
import type { CombatSnapshot, SkillMechanics } from '@psyblr/contracts';
import {
  createCombatState,
  runCombat,
  stepCombat,
  MAX_COMBAT_TICKS,
  OVERDRIVE_START_TICK,
  FINAL_COLLAPSE_START_TICK,
} from './index';

const skill = (kind: SkillMechanics['kind'], extra: Partial<SkillMechanics> = {}): SkillMechanics => ({
  kind,
  cooldownMs: 500,
  initialDelayMs: 100,
  presentationKey: kind,
  ...extra,
});

const snapshot = (
  players: CombatSnapshot['units'],
  enemies: CombatSnapshot['units'],
  mode: 'campaign' | 'raid' = 'raid'
): CombatSnapshot => ({ battleId: 'test', mode, units: [...players, ...enemies] });

const unit = (
  id: string,
  side: 'player' | 'enemy',
  x: number,
  z: number,
  overrides: Partial<CombatSnapshot['units'][number]> = {}
): CombatSnapshot['units'][number] => ({
  id,
  definitionId: id,
  side,
  spawnCell: { x, z },
  hp: 250,
  atk: 80,
  def: 20,
  attacksPerSecond: 1,
  range: 1,
  moveSpeed: 4,
  skill1Id: null,
  skill1: null,
  ...overrides,
});

describe('deterministic combat core', () => {
  it('replays a command script byte-for-byte', () => {
    const input = snapshot(
      [unit('alpha', 'player', 3, 6, { skill1Id: 's', skill1: skill('stun', { durationMs: 400 }) })],
      [unit('bravo', 'enemy', 3, 1)]
    );
    const commands = [{ type: 'cast_skill_1' as const, actorId: 'alpha', issuedAtTick: 1 }];
    expect(JSON.stringify(runCombat(input, 7, commands).events)).toBe(JSON.stringify(runCombat(input, 7, commands).events));
  });

  it('moves deterministically before attacking in range', () => {
    const state = createCombatState(snapshot([unit('a', 'player', 0, 7)], [unit('b', 'enemy', 0, 0)]), 1);
    const first = stepCombat(state).events;
    expect(first.some((event) => event.type === 'move' && event.actorId === 'a')).toBe(true);
    expect(first.some((event) => event.type === 'damage')).toBe(false);
  });

  it('uses defense, death once, and one end event', () => {
    const result = runCombat(
      snapshot([unit('a', 'player', 0, 0, { atk: 500, range: 2 })], [unit('b', 'enemy', 0, 1, { hp: 100, def: 100 })]),
      1
    );
    expect(result.events.filter((event) => event.type === 'damage')[0]?.payload.amount).toBe(250);
    expect(result.events.filter((event) => event.type === 'death')).toHaveLength(1);
    expect(result.events.filter((event) => event.type === 'battle_end')).toHaveLength(1);
  });

  it('rejects an early manual cast and accepts it when ready', () => {
    const state = createCombatState(
      snapshot([unit('a', 'player', 0, 0, { skill1Id: 's', skill1: skill('stun') })], [unit('b', 'enemy', 0, 1)]),
      1
    );
    expect(stepCombat(state, [{ type: 'cast_skill_1', actorId: 'a', issuedAtTick: 0 }]).acceptedCommands).toHaveLength(0);
    expect(stepCombat(state, [{ type: 'cast_skill_1', actorId: 'a', issuedAtTick: 1 }]).acceptedCommands).toHaveLength(1);
    expect(stepCombat(state, [{ type: 'cast_skill_1', actorId: 'a', issuedAtTick: 2 }]).acceptedCommands).toHaveLength(0);
  });

  it('implements slow, shield, vulnerability and taunt statuses', () => {
    const state = createCombatState(
      snapshot(
        [
          unit('eren', 'player', 1, 1, { skill1Id: 'e', skill1: skill('taunt_shield', { radius: 5, durationMs: 400, shieldMultiplier: 1 }) }),
          unit('l', 'player', 2, 1, { skill1Id: 'l', skill1: skill('mark_vulnerability', { durationMs: 400, vulnerabilityPercent: 100 }) }),
        ],
        [unit('enemy', 'enemy', 1, 2, { hp: 999 })]
      ),
      1
    );
    stepCombat(state);
    const cast = stepCombat(state, [
      { type: 'cast_skill_1', actorId: 'eren', issuedAtTick: 1 },
      { type: 'cast_skill_1', actorId: 'l', issuedAtTick: 1 },
    ]);
    expect(cast.events.some((event) => event.type === 'shield_changed')).toBe(true);
    expect(cast.events.filter((event) => event.type === 'status_applied').map((event) => event.payload.status)).toEqual(
      expect.arrayContaining(['taunt', 'vulnerability'])
    );
    expect(state.units.find((entry) => entry.id === 'enemy')?.targetId).toBe('eren');
  });

  it('resolves winner deterministically when one team eliminates the other', () => {
    const result = runCombat(
      snapshot(
        [unit('a', 'player', 0, 0, { atk: 120, range: 2, hp: 500 })],
        [unit('b', 'enemy', 0, 1, { atk: 20, range: 2, hp: 100 })],
        'raid'
      ),
      3
    );
    expect(result.winner).toBe('player');
    expect(result.ended).toBe(true);
  });

  it('transitions through anti-stall Overdrive and Final Collapse phases', () => {
    const state = createCombatState(
      snapshot(
        [unit('tank_a', 'player', 0, 0, { atk: 0, hp: 50000, def: 500 })],
        [unit('tank_b', 'enemy', 7, 7, { atk: 0, hp: 50000, def: 500 })]
      ),
      1
    );

    while (!state.ended) {
      stepCombat(state);
    }

    expect(state.ended).toBe(true);
    expect(state.tick).toBeLessThanOrEqual(MAX_COMBAT_TICKS);
    expect(state.events.some((e) => e.type === 'combat_phase_changed' && e.payload.phase === 'OVERDRIVE')).toBe(true);
    expect(state.events.some((e) => e.type === 'combat_phase_changed' && e.payload.phase === 'FINAL_COLLAPSE')).toBe(true);
  });
});
