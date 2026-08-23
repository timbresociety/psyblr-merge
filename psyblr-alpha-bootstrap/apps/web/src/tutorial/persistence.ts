import type { BattlefieldPlacement, CampPlacement, MergeRuntimeSnapshot, RaidSquadDraft, RaidSquadSnapshot, SpawnRuntimeSnapshot, SummonInstance } from '@psyblr/contracts';
import { createEmptyRaidSquadDraft } from '@psyblr/game-rules';
import { createTutorialSpawnRuntime } from '../spawn/gateway';
import type { TutorialContext } from '@psyblr/tutorial-core';
import type { CampaignBattleCheckpoint } from '../game/battleSession';

export type TutorialCheckpoint = { schemaVersion: 5; tutorialVersion: 1; currentStepId: string | null; completedStepIds: string[]; context: TutorialContext; inventory: SummonInstance[]; placements: BattlefieldPlacement[]; campPlacements: CampPlacement[]; spawn: SpawnRuntimeSnapshot; merge: MergeRuntimeSnapshot; raidDraft: RaidSquadDraft; raidSnapshot: RaidSquadSnapshot | null; battle: CampaignBattleCheckpoint | null };
type TutorialCheckpointV1 = Omit<TutorialCheckpoint, 'schemaVersion' | 'campPlacements' | 'spawn' | 'merge' | 'raidDraft' | 'raidSnapshot'> & { schemaVersion: 1 };
type TutorialCheckpointV2 = Omit<TutorialCheckpoint, 'schemaVersion' | 'spawn' | 'merge' | 'raidDraft' | 'raidSnapshot'> & { schemaVersion: 2 };
type TutorialCheckpointV3 = Omit<TutorialCheckpoint, 'schemaVersion' | 'merge' | 'raidDraft' | 'raidSnapshot'> & { schemaVersion: 3 };
type TutorialCheckpointV4 = Omit<TutorialCheckpoint, 'schemaVersion' | 'raidDraft' | 'raidSnapshot'> & { schemaVersion: 4 };
export interface TutorialProgressRepository { load(): TutorialCheckpoint | null; save(checkpoint: TutorialCheckpoint): void; clear(): void; }
const KEY = 'psyblr:tutorial:v1';

export function migrateTutorialCheckpoint(value: unknown): TutorialCheckpoint | null {
  if (!value || typeof value !== 'object') return null;
  const checkpoint = value as Partial<TutorialCheckpoint> & Partial<TutorialCheckpointV1> & Partial<TutorialCheckpointV2> & Partial<TutorialCheckpointV3> & Partial<TutorialCheckpointV4>;
  if (checkpoint.tutorialVersion !== 1 || !Array.isArray(checkpoint.completedStepIds) || !Array.isArray(checkpoint.inventory) || !Array.isArray(checkpoint.placements) || !('battle' in checkpoint)) return null;
  if (checkpoint.schemaVersion === 5 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn && checkpoint.merge && checkpoint.raidDraft) return checkpoint as TutorialCheckpoint;
  if (checkpoint.schemaVersion === 4 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn && checkpoint.merge) return { ...(checkpoint as TutorialCheckpointV4), schemaVersion: 5, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null };
  if (checkpoint.schemaVersion === 3 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn) return { ...(checkpoint as TutorialCheckpointV3), schemaVersion: 5, merge: { appliedActionIds: [] }, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null };
  if (checkpoint.schemaVersion === 2 && Array.isArray(checkpoint.campPlacements)) return { ...(checkpoint as TutorialCheckpointV2), schemaVersion: 5, spawn: createTutorialSpawnRuntime(), merge: { appliedActionIds: [] }, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null };
  if (checkpoint.schemaVersion === 1) return { ...(checkpoint as TutorialCheckpointV1), schemaVersion: 5, campPlacements: [], spawn: createTutorialSpawnRuntime(), merge: { appliedActionIds: [] }, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null };
  return null;
}

export const localTutorialProgress: TutorialProgressRepository = {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY); if (!raw) return null;
      const migrated = migrateTutorialCheckpoint(JSON.parse(raw));
      if (migrated?.schemaVersion === 5) window.localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    } catch { return null; }
  },
  save(checkpoint) { try { window.localStorage.setItem(KEY, JSON.stringify(checkpoint)); } catch { /* storage can be unavailable */ } },
  clear() { try { window.localStorage.removeItem(KEY); } catch { /* storage can be unavailable */ } },
};
