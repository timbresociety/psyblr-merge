import { describe, expect, it } from 'vitest';
import { createStarterSummonInstances } from '@psyblr/game-content';
import { createInitialCampPlacements } from './gameStore';
import { useGameStore } from './gameStore';
import type { MergeSummonsResult, SummonInstance } from '@psyblr/contracts';
import { createEmptyRaidSquadDraft } from '@psyblr/game-rules';

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

describe('raid store', () => {
  it('adds/removes per round, permits cross-round reuse, and locks only once', () => {
    const inventory: SummonInstance[] = Array.from({ length: 6 }, (_, index) => ({ id: `unit-${index}`, definitionId: index < 2 ? 'goku' : 'naruto', tier: 'F' }));
    useGameStore.setState({ inventory, tutorialStepId: null, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null, raidError: null });
    const store = useGameStore.getState(); expect(store.selectRaidSummon('round1', 'unit-0')).toBe(true); expect(store.selectRaidSummon('round2', 'unit-0')).toBe(true); expect(store.selectRaidSummon('round2', 'unit-0')).toBe(false); store.removeRaidSummon('round2', 0); expect(useGameStore.getState().raidDraft.round2[0]).toBeNull();
    for (const id of ['unit-0', 'unit-1', 'unit-2']) useGameStore.getState().selectRaidSummon('round2', id);
    for (const id of inventory) useGameStore.getState().selectRaidSummon('round3', id.id);
    expect(useGameStore.getState().startRaid()).toBe(true); const snapshot = useGameStore.getState().raidSnapshot; expect(snapshot?.round3).toHaveLength(6); expect(useGameStore.getState().startRaid()).toBe(true); expect(useGameStore.getState().raidSnapshot).toBe(snapshot);
    inventory[0]!.tier = 'SSS'; expect(snapshot?.round1[0]?.tier).toBe('F');
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
