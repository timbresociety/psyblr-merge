import { describe, expect, it } from 'vitest';
import { GAME_CONTENT_VERSION } from '@psyblr/game-content';
import type { StartRaidRoundRequest } from '@psyblr/contracts';
import { createTutorialRaidGateway } from './gateway';

const round1: StartRaidRoundRequest = { clientActionId: 'same-action', raidId: 'raid-1', rootSeed: 'seed-1', contentVersion: GAME_CONTENT_VERSION, roundId: 'round1', attacker: [{ instanceId: 'a', definitionId: 'goku', tier: 'F' }, { instanceId: 'b', definitionId: 'naruto', tier: 'F' }] };
describe('tutorial Raid authority', () => {
  it('resolves one locked field idempotently', async () => {
    const gateway = createTutorialRaidGateway(); const first = await gateway.resolveRound(round1); const retry = await gateway.resolveRound(round1);
    expect(first.round.roundSize).toBe(2); expect(first.round.outcome).toBe('win'); expect(retry).toEqual(first);
  });
  it('rejects stale client formation content', async () => {
    await expect(createTutorialRaidGateway().resolveRound({ ...round1, contentVersion: 'stale' })).rejects.toThrow('out of date');
  });
});
