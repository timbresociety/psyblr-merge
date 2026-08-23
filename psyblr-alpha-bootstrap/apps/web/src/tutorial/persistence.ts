import type { BattlefieldPlacement, CampPlacement, MergeRuntimeSnapshot, SpawnRuntimeSnapshot, SummonInstance } from '@psyblr/contracts';
import { createTutorialSpawnRuntime } from '../spawn/gateway';
import type { TutorialContext } from '@psyblr/tutorial-core';
import type { CampaignBattleCheckpoint } from '../game/battleSession';

export type TutorialCheckpoint = { schemaVersion: 4; tutorialVersion: 1; currentStepId: string | null; completedStepIds: string[]; context: TutorialContext; inventory: SummonInstance[]; placements: BattlefieldPlacement[]; campPlacements: CampPlacement[]; spawn: SpawnRuntimeSnapshot; merge: MergeRuntimeSnapshot; battle: CampaignBattleCheckpoint | null };
type TutorialCheckpointV1 = Omit<TutorialCheckpoint, 'schemaVersion' | 'campPlacements' | 'spawn' | 'merge'> & { schemaVersion: 1 };
type TutorialCheckpointV2 = Omit<TutorialCheckpoint, 'schemaVersion' | 'spawn' | 'merge'> & { schemaVersion: 2 };
type TutorialCheckpointV3 = Omit<TutorialCheckpoint, 'schemaVersion' | 'merge'> & { schemaVersion: 3 };
export interface TutorialProgressRepository { load(): TutorialCheckpoint | null; save(checkpoint: TutorialCheckpoint): void; clear(): void; }
const KEY = 'psyblr:tutorial:v1';

export function migrateTutorialCheckpoint(value: unknown): TutorialCheckpoint | null {
  if (!value || typeof value !== 'object') return null;
  const checkpoint = value as Partial<TutorialCheckpoint> & Partial<TutorialCheckpointV1> & Partial<TutorialCheckpointV2> & Partial<TutorialCheckpointV3>;
  if (checkpoint.tutorialVersion !== 1 || !Array.isArray(checkpoint.completedStepIds) || !Array.isArray(checkpoint.inventory) || !Array.isArray(checkpoint.placements) || !('battle' in checkpoint)) return null;
  if (checkpoint.schemaVersion === 4 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn && checkpoint.merge) return checkpoint as TutorialCheckpoint;
  if (checkpoint.schemaVersion === 3 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn) return { ...(checkpoint as TutorialCheckpointV3), schemaVersion: 4, merge: { appliedActionIds: [] } };
  if (checkpoint.schemaVersion === 2 && Array.isArray(checkpoint.campPlacements)) return { ...(checkpoint as TutorialCheckpointV2), schemaVersion: 4, spawn: createTutorialSpawnRuntime(), merge: { appliedActionIds: [] } };
  if (checkpoint.schemaVersion === 1) return { ...(checkpoint as TutorialCheckpointV1), schemaVersion: 4, campPlacements: [], spawn: createTutorialSpawnRuntime(), merge: { appliedActionIds: [] } };
  return null;
}

export const localTutorialProgress: TutorialProgressRepository = {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY); if (!raw) return null;
      const migrated = migrateTutorialCheckpoint(JSON.parse(raw));
      if (migrated?.schemaVersion === 4) window.localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    } catch { return null; }
  },
  save(checkpoint) { try { window.localStorage.setItem(KEY, JSON.stringify(checkpoint)); } catch { /* storage can be unavailable */ } },
  clear() { try { window.localStorage.removeItem(KEY); } catch { /* storage can be unavailable */ } },
};
