import { spawnMachineDefinition, summonDefinitions } from '@psyblr/game-content';
import { findFirstExposedCampCell } from '@psyblr/game-rules';
import type { CampPlacement, ReleaseBallRequest, ReleaseBallResult, SpawnRuntimeSnapshot, SummonInstance } from '@psyblr/contracts';

export type SpawnGatewayState = { runtime: SpawnRuntimeSnapshot; inventory: readonly SummonInstance[]; campPlacements: readonly CampPlacement[]; primaryDefinitionId: string };
export interface SpawnGateway { getState(): SpawnRuntimeSnapshot; releaseBall(request: ReleaseBallRequest): Promise<ReleaseBallResult>; }

export function createTutorialSpawnRuntime(): SpawnRuntimeSnapshot {
  return { balls: spawnMachineDefinition.dailyBallCap, ballCapacity: spawnMachineDefinition.dailyBallCap,
    dailyPool: summonDefinitions.map((summon, slotIndex) => ({ slotIndex, summonDefinitionId: summon.id, probability: spawnMachineDefinition.binProbabilities[slotIndex]! })),
    blobProgress: Object.fromEntries(spawnMachineDefinition.blobTargets.map((blob) => [blob.id, 0])), tutorialDropIndex: 0, appliedActionIds: [] };
}

export function tutorialRewardSlot(runtime: SpawnRuntimeSnapshot, primaryDefinitionId: string): number {
  const primarySlot = runtime.dailyPool.find((slot) => slot.summonDefinitionId === primaryDefinitionId)?.slotIndex ?? 0;
  return runtime.tutorialDropIndex < spawnMachineDefinition.tutorial.guaranteeCopiesOfPrimary ? primarySlot : runtime.tutorialDropIndex % runtime.dailyPool.length;
}

/** A local emulation of the future release-ball server function. It deliberately has no presentation or physics input. */
export function createTutorialSpawnGateway(read: () => SpawnGatewayState): SpawnGateway {
  return {
    getState: () => read().runtime,
    async releaseBall(request) {
      const state = read();
      if (state.runtime.appliedActionIds.includes(request.clientActionId)) throw new Error('This action was already applied');
      if (state.runtime.balls <= 0) throw new Error('No balls remaining');
      const destination = findFirstExposedCampCell(state.campPlacements);
      if (!destination) throw new Error('Battle Camp is full');
      const rewardSlot = tutorialRewardSlot(state.runtime, state.primaryDefinitionId);
      const pool = state.runtime.dailyPool[rewardSlot]!;
      const drop = state.runtime.tutorialDropIndex + 1;
      return { clientActionId: request.clientActionId, rewardSlot, createdSummon: { id: `spawn:tutorial:${drop.toString().padStart(2, '0')}`, definitionId: pool.summonDefinitionId, tier: 'F' }, destination: { summonInstanceId: `spawn:tutorial:${drop.toString().padStart(2, '0')}`, cell: destination }, ballsRemaining: state.runtime.balls - 1, blobProgress: state.runtime.blobProgress, replay: { replayId: `tutorial-drop-${drop}`, rewardSlot, presentationSeed: `tutorial-001:${drop}` } };
    },
  };
}
