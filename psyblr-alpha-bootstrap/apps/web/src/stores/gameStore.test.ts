import { describe, expect, it } from 'vitest';
import { createStarterSummonInstances } from '@psyblr/game-content';
import { createInitialCampPlacements } from './gameStore';
import { useGameStore } from './gameStore';
import type { MergeSummonsResult } from '@psyblr/contracts';

describe('base initialization', () => {
  it('uses the same campaign instance ids on deterministic exposed row three', () => {
    const inventory = createStarterSummonInstances();
    const campaign = inventory.map((instance, index) => ({ summonInstanceId: instance.id, cell: { x: index, z: 4 } }));
    const camp = createInitialCampPlacements(inventory, campaign);
    expect(camp).toHaveLength(6);
    expect(camp.map((placement) => placement.summonInstanceId)).toEqual(campaign.map((placement) => placement.summonInstanceId));
    expect(camp.map((placement) => placement.cell)).toEqual(Array.from({ length: 6 }, (_, x) => ({ x, y: 3 })));
  });
  it('has a deterministic owned-starter fallback without duplication', () => {
    const inventory = createStarterSummonInstances();
    const camp = createInitialCampPlacements(inventory, []);
    expect(new Set(camp.map((placement) => placement.summonInstanceId)).size).toBe(6);
  });
});

describe('authoritative merge result application', () => {
  it('consumes only the source, preserves target placement, and cleans stale selections/deployments', () => {
    const inventory = [{ id: 'source', definitionId: 'goku', tier: 'F' as const }, { id: 'target', definitionId: 'goku', tier: 'F' as const }];
    const result: MergeSummonsResult = { clientActionId: 'merge-store-1', consumedSourceInstanceId: 'source', upgradedTarget: { id: 'target', definitionId: 'goku', tier: 'E' }, previousTier: 'F', nextTier: 'E', targetPlacement: { summonInstanceId: 'target', cell: { x: 1, y: 0 } }, replay: { replayId: 'merge-store-1', presentationSeed: 'test', effect: 'merge_pulse' } };
    useGameStore.setState({ inventory, placements: [{ summonInstanceId: 'source', cell: { x: 0, z: 4 } }], campPlacements: [{ summonInstanceId: 'source', cell: { x: 0, y: 1 } }, { summonInstanceId: 'target', cell: { x: 1, y: 0 } }], merge: { appliedActionIds: [] }, mergePendingIds: ['source', 'target'], selectedSummonInstanceId: 'source', selectedCampSummonInstanceId: 'source', campInteractionMode: 'selected' });
    expect(useGameStore.getState().applyMergeResult(result)).toBe(true);
    const state = useGameStore.getState();
    expect(state.inventory).toEqual([{ id: 'target', definitionId: 'goku', tier: 'E' }]);
    expect(state.campPlacements).toEqual([result.targetPlacement]);
    expect(state.placements).toEqual([{ summonInstanceId: 'target', cell: { x: 0, z: 4 } }]);
    expect(state.selectedSummonInstanceId).toBe('target'); expect(state.selectedCampSummonInstanceId).toBe('target');
    expect(state.applyMergeResult(result)).toBe(false);
  });
});
