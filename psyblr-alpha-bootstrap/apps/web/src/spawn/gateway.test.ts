import { describe, expect, it } from 'vitest';
import { createStarterSummonInstances } from '@psyblr/game-content';
import { createTutorialSpawnGateway, createTutorialSpawnRuntime } from './gateway';

describe('tutorial spawn authority', () => {
  it('fills thirty exposed cells with eight guaranteed primary copies and rejects a 31st release', async () => {
    const inventory = createStarterSummonInstances(); const campPlacements = inventory.map((entry, x) => ({ summonInstanceId: entry.id, cell: { x, y: 0 } })); const runtime = createTutorialSpawnRuntime();
    const state = { runtime, inventory, campPlacements, primaryDefinitionId: inventory[0]!.definitionId };
    const gateway = createTutorialSpawnGateway(() => state); const spawned: string[] = [];
    for (let index = 0; index < 30; index += 1) { const result = await gateway.releaseBall({ clientActionId: `a-${index}` }); spawned.push(result.createdSummon.definitionId); state.runtime = { ...state.runtime, balls: result.ballsRemaining, tutorialDropIndex: state.runtime.tutorialDropIndex + 1, appliedActionIds: [...state.runtime.appliedActionIds, result.clientActionId] }; state.inventory = [...state.inventory, result.createdSummon]; state.campPlacements = [...state.campPlacements, result.destination]; }
    expect(state.campPlacements).toHaveLength(36); expect(state.runtime.balls).toBe(70); expect(spawned.filter((id) => id === state.primaryDefinitionId).length).toBeGreaterThanOrEqual(8);
    await expect(gateway.releaseBall({ clientActionId: 'a-31' })).rejects.toThrow('Battle Camp is full');
  });
});
