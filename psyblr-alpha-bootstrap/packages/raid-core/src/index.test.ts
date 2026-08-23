import { describe, expect, it } from 'vitest';
import type { RaidSquadSnapshot } from '@psyblr/contracts';
import { canonicalSquad, deriveRoundSeed, resolveRaidOutcome, simulateRaid } from './index';

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
});
