import { describe, expect, it } from 'vitest';
import type { RaidSquadSnapshot } from '@psyblr/contracts';
import { buildRaidRoundSnapshotFromPlacements, canonicalSquad, deriveRoundSeed, mirrorDefenseCell, resolveRaidOutcome, simulateRaid } from './index';

const squad: RaidSquadSnapshot = {
  clientActionId: 'test-action', contentVersion: '1',
  round1: [{ instanceId: 'a', definitionId: 'goku', tier: 'F' }, { instanceId: 'b', definitionId: 'naruto', tier: 'F' }],
  round2: [{ instanceId: 'a', definitionId: 'goku', tier: 'F' }, { instanceId: 'b', definitionId: 'naruto', tier: 'F' }, { instanceId: 'c', definitionId: 'luffy', tier: 'F' }, { instanceId: 'd', definitionId: 'eren', tier: 'F' }],
  round3: [{ instanceId: 'a', definitionId: 'goku', tier: 'F' }, { instanceId: 'b', definitionId: 'naruto', tier: 'F' }, { instanceId: 'c', definitionId: 'luffy', tier: 'F' }, { instanceId: 'd', definitionId: 'eren', tier: 'F' }, { instanceId: 'e', definitionId: 'l', tier: 'F' }, { instanceId: 'f', definitionId: 'lelouch', tier: 'F' }],
};
describe('raid core', () => {
  it('derives distinct stable seeds and deterministic event logs', () => {
    const attacker = canonicalSquad(squad); const defender = canonicalSquad({ ...squad, clientActionId: 'defender' });
    const first = simulateRaid(attacker, defender, 'root-seed', 'raid-1'); const second = simulateRaid(attacker, defender, 'root-seed', 'raid-1');
    expect(deriveRoundSeed('root-seed', 'round1')).not.toBe(deriveRoundSeed('root-seed', 'round2'));
    expect(first.rounds.map((round) => round.combatSnapshot.units.length)).toEqual([4, 8, 12]);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
  it('reduces wins, losses, draws, and equal records correctly', () => {
    expect(resolveRaidOutcome([{ outcome: 'win' }, { outcome: 'draw' }, { outcome: 'win' }])).toBe('win');
    expect(resolveRaidOutcome([{ outcome: 'win' }, { outcome: 'loss' }, { outcome: 'draw' }])).toBe('draw');
  });
  it('preserves attacker cells and mirrors normalized defense cells', () => {
    const snapshot = buildRaidRoundSnapshotFromPlacements([{ summon: squad.round1[0]!, cell: { x: 0, z: 7 } }, { summon: squad.round1[1]!, cell: { x: 7, z: 6 } }], [{ summon: squad.round1[0]!, cell: { x: 1, z: 6 } }, { summon: squad.round1[1]!, cell: { x: 6, z: 5 } }], { id: 'round1', number: 1, slotCount: 2 }, 'raid');
    expect(snapshot.units.filter((unit) => unit.side === 'player').map((unit) => unit.spawnCell)).toEqual([{ x: 7, z: 6 }, { x: 0, z: 7 }]);
    expect(snapshot.units.filter((unit) => unit.side === 'enemy').map((unit) => unit.spawnCell)).toEqual([{ x: 6, z: 2 }, { x: 1, z: 1 }]);
    expect(mirrorDefenseCell({ x: 3, z: 6 })).toEqual({ x: 3, z: 1 });
  });
});
