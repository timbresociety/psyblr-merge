import { canMerge, getCampPlacementForSummon, nextTier } from '@psyblr/game-rules';
import type { CampPlacement, MergeRuntimeSnapshot, MergeSummonsRequest, MergeSummonsResult, SummonInstance } from '@psyblr/contracts';

export type MergeGatewayState = { merge: MergeRuntimeSnapshot; inventory: readonly SummonInstance[]; campPlacements: readonly CampPlacement[] };
export interface MergeGateway {
  mergeSummons(request: MergeSummonsRequest): Promise<MergeSummonsResult>;
  acknowledge(result: MergeSummonsResult): void;
}

/** Local tutorial emulation of the future transactional merge endpoint. */
export function createTutorialMergeGateway(read: () => MergeGatewayState): MergeGateway {
  const results = new Map<string, MergeSummonsResult>();
  const reserved = new Set<string>();
  let queue = Promise.resolve();
  const compute = (request: MergeSummonsRequest): MergeSummonsResult => {
    const cached = results.get(request.clientActionId); if (cached) return cached;
    if (reserved.has(request.sourceSummonInstanceId) || reserved.has(request.targetSummonInstanceId)) throw new Error('A selected Summon is already merging');
    if (request.sourceSummonInstanceId === request.targetSummonInstanceId) throw new Error('Choose two different Summons');
    const state = read();
    if (state.merge.appliedActionIds.includes(request.clientActionId)) throw new Error('This merge was already applied');
    const source = state.inventory.find((item) => item.id === request.sourceSummonInstanceId);
    const target = state.inventory.find((item) => item.id === request.targetSummonInstanceId);
    const targetPlacement = getCampPlacementForSummon(request.targetSummonInstanceId, state.campPlacements);
    if (!source || !target || !getCampPlacementForSummon(request.sourceSummonInstanceId, state.campPlacements) || !targetPlacement) throw new Error('Summon is no longer in the Battle Camp');
    if (!canMerge(source, target)) throw new Error(source.definitionId !== target.definitionId || source.tier !== target.tier ? 'Needs same Summon and tier' : 'Max tier reached');
    const tier = nextTier(target.tier); if (!tier) throw new Error('Max tier reached');
    const result: MergeSummonsResult = { clientActionId: request.clientActionId, consumedSourceInstanceId: source.id, upgradedTarget: { ...target, tier }, previousTier: target.tier, nextTier: tier, targetPlacement, replay: { replayId: `tutorial-merge-${request.clientActionId}`, presentationSeed: `tutorial-merge:${request.clientActionId}`, effect: 'merge_pulse' } };
    results.set(request.clientActionId, result); reserved.add(source.id); reserved.add(target.id); return result;
  };
  return {
    mergeSummons(request) { const work = queue.then(() => compute(request)); queue = work.then(() => undefined, () => undefined); return work; },
    acknowledge(result) { reserved.delete(result.consumedSourceInstanceId); reserved.delete(result.upgradedTarget.id); },
  };
}
