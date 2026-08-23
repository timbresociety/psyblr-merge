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
  it('only lets players assemble the active field before it is locked', () => {
    const inventory: SummonInstance[] = Array.from({ length: 6 }, (_, index) => ({ id: `unit-${index}`, definitionId: index < 2 ? 'goku' : 'naruto', tier: 'F' }));
    useGameStore.setState({ inventory, tutorialStepId: null, raidDraft: createEmptyRaidSquadDraft(), raidFieldPlacements: { round1: [], round2: [], round3: [] }, selectedRaidSummonInstanceId: null, hoveredRaidCell: null, raidSnapshot: null, raidResult: null, raidRoundResults: [], raidRoundResolutions: [], raidSessionId: null, raidRootSeed: null, raidOpponent: null, raidStatus: 'setup', raidError: null });
    const store = useGameStore.getState(); expect(store.selectRaidSummon('round2', 'unit-0')).toBe(false); expect(store.selectRaidSummon('round1', 'unit-0')).toBe(true); expect(store.requestRaidPlacement({ x: 0, z: 4 })).toBe(true); expect(useGameStore.getState().raidDraft.round1[0]).toBe('unit-0'); expect(store.selectRaidSummon('round1', 'unit-1')).toBe(true); expect(store.requestRaidPlacement({ x: 1, z: 4 })).toBe(true); expect(useGameStore.getState().raidFieldPlacements.round1).toHaveLength(2);
    expect(useGameStore.getState().startRaid()).toBe(true); expect(useGameStore.getState().raidStatus).toBe('resolving');
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

describe('merge camp movement', () => {
  it('allows camp positioning in and out of Illuminati slots before merging', () => {
    const inventory: SummonInstance[] = [{ id: 'protected', definitionId: 'goku', tier: 'F' }, { id: 'copy', definitionId: 'goku', tier: 'F' }];
    useGameStore.setState({ inventory, campPlacements: [{ summonInstanceId: 'protected', cell: { x: 0, y: 0 } }, { summonInstanceId: 'copy', cell: { x: 2, y: 2 } }], tutorialStepId: 'merge_first', tutorialCompletedStepIds: [], tutorialContext: {}, selectedCampSummonInstanceId: null, campInteractionMode: 'idle', mergePendingIds: [], mergeError: null });
    const store = useGameStore.getState();
    store.selectCampSummon('protected');
    expect(store.requestCampMove({ x: 1, y: 2 })).toBe(true);
    expect(useGameStore.getState().campPlacements).toContainEqual({ summonInstanceId: 'protected', cell: { x: 1, y: 2 } });
    useGameStore.getState().selectCampSummon('protected');
    expect(useGameStore.getState().requestCampMove({ x: 1, y: 0 })).toBe(true);
    expect(useGameStore.getState().campPlacements).toContainEqual({ summonInstanceId: 'protected', cell: { x: 1, y: 0 } });
  });
});
