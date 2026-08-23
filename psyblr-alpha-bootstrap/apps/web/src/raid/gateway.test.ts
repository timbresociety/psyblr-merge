import { describe, expect, it } from 'vitest';
import { GAME_CONTENT_VERSION } from '@psyblr/game-content';
import type { StartRaidRoundRequest } from '@psyblr/contracts';
import { createTutorialRaidGateway } from './gateway';

const round1: StartRaidRoundRequest = { clientActionId: 'same-action', raidId: 'raid-1', rootSeed: 'seed-1', contentVersion: GAME_CONTENT_VERSION, roundId: 'round1', attacker: [{ instanceId: 'a', definitionId: 'goku', tier: 'F' }, { instanceId: 'b', definitionId: 'naruto', tier: 'F' }], attackerPlacements: [{ summon: { instanceId: 'a', definitionId: 'goku', tier: 'F' }, cell: { x: 0, z: 7 } }, { summon: { instanceId: 'b', definitionId: 'naruto', tier: 'F' }, cell: { x: 7, z: 6 } }] };
const round2: StartRaidRoundRequest = { ...round1, clientActionId: 'round-two', roundId: 'round2', attacker: ['a', 'b', 'c', 'd'].map((instanceId) => ({ instanceId, definitionId: 'goku', tier: 'F' })), attackerPlacements: ['a', 'b', 'c', 'd'].map((instanceId, index) => ({ summon: { instanceId, definitionId: 'goku', tier: 'F' as const }, cell: { x: index, z: 4 } })) };
describe('tutorial Raid authority', () => {
  it('resolves one locked field idempotently', async () => {
    const gateway = createTutorialRaidGateway(); const first = await gateway.resolveRound(round1); const retry = await gateway.resolveRound(round1);
    expect(first.round.roundSize).toBe(2); expect(first.round.outcome).toBe('win'); expect(first.round.combatSnapshot.units.filter((unit) => unit.side === 'player').map((unit) => unit.spawnCell)).toEqual([{ x: 7, z: 6 }, { x: 0, z: 7 }]); expect(retry).toEqual(first);
  });
  it('rejects stale client formation content', async () => {
    await expect(createTutorialRaidGateway().resolveRound({ ...round1, contentVersion: 'stale' })).rejects.toThrow('out of date');
  });
  it('makes the tutorial second field a quick win rather than a timeout', async () => {
    const result = await createTutorialRaidGateway().resolveRound(round2);
    expect(result.round.outcome).toBe('win');
    expect(result.round.events.at(-1)?.payload.reason).toBe('elimination');
  });
});
