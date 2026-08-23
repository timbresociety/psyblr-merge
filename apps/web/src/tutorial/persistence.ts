import { OpponentCampHandoffSchema, RaidResultSchema, RaidSquadDraftSchema, RaidSquadSnapshotSchema, type BattlefieldPlacement, type CampPlacement, type MergeRuntimeSnapshot, type OpponentCampHandoff, type RaidResult, type RaidSquadDraft, type RaidSquadSnapshot, type SpawnRuntimeSnapshot, type SummonInstance } from '@psyblr/contracts';
import { createEmptyRaidSquadDraft } from '@psyblr/game-rules';
import { createTutorialSpawnRuntime } from '../spawn/gateway';
import type { TutorialContext } from '@psyblr/tutorial-core';
import type { CampaignBattleCheckpoint } from '../game/battleSession';

export type TutorialCheckpoint = { schemaVersion: 8; tutorialVersion: 1; currentStepId: string | null; completedStepIds: string[]; context: TutorialContext; inventory: SummonInstance[]; placements: BattlefieldPlacement[]; campPlacements: CampPlacement[]; spawn: SpawnRuntimeSnapshot; merge: MergeRuntimeSnapshot; raidDraft: RaidSquadDraft; raidSnapshot: RaidSquadSnapshot | null; raidResult: RaidResult | null; opponentCamp: OpponentCampHandoff | null; selectedStealTargetId: string | null; battle: CampaignBattleCheckpoint | null };
type TutorialCheckpointV1 = Omit<TutorialCheckpoint, 'schemaVersion' | 'campPlacements' | 'spawn' | 'merge' | 'raidDraft' | 'raidSnapshot'> & { schemaVersion: 1 };
type TutorialCheckpointV2 = Omit<TutorialCheckpoint, 'schemaVersion' | 'spawn' | 'merge' | 'raidDraft' | 'raidSnapshot'> & { schemaVersion: 2 };
type TutorialCheckpointV3 = Omit<TutorialCheckpoint, 'schemaVersion' | 'merge' | 'raidDraft' | 'raidSnapshot'> & { schemaVersion: 3 };
type TutorialCheckpointV4 = Omit<TutorialCheckpoint, 'schemaVersion' | 'raidDraft' | 'raidSnapshot'> & { schemaVersion: 4 };
type TutorialCheckpointV5 = Omit<TutorialCheckpoint, 'schemaVersion' | 'raidResult'> & { schemaVersion: 5 };
type TutorialCheckpointV6 = Omit<TutorialCheckpoint, 'schemaVersion' | 'opponentCamp' | 'selectedStealTargetId'> & { schemaVersion: 6 };
type TutorialCheckpointV7 = Omit<TutorialCheckpoint, 'schemaVersion' | 'opponentCamp' | 'selectedStealTargetId'> & { schemaVersion: 7 };
export interface TutorialProgressRepository { load(): TutorialCheckpoint | null; save(checkpoint: TutorialCheckpoint): void; clear(): void; }
const KEY = 'psyblr:tutorial:v1';

export function migrateTutorialCheckpoint(value: unknown): TutorialCheckpoint | null {
  if (!value || typeof value !== 'object') return null;
  const checkpoint = value as Partial<TutorialCheckpoint> & Partial<TutorialCheckpointV1> & Partial<TutorialCheckpointV2> & Partial<TutorialCheckpointV3> & Partial<TutorialCheckpointV4> & Partial<TutorialCheckpointV5> & Partial<TutorialCheckpointV6> & Partial<TutorialCheckpointV7>;
  if (checkpoint.tutorialVersion !== 1 || !Array.isArray(checkpoint.completedStepIds) || !Array.isArray(checkpoint.inventory) || !Array.isArray(checkpoint.placements) || !('battle' in checkpoint)) return null;
  if (checkpoint.schemaVersion === 8 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn && checkpoint.merge && RaidSquadDraftSchema.safeParse(checkpoint.raidDraft).success && (checkpoint.raidSnapshot === null || RaidSquadSnapshotSchema.safeParse(checkpoint.raidSnapshot).success) && (checkpoint.raidResult === null || RaidResultSchema.safeParse(checkpoint.raidResult).success) && (checkpoint.opponentCamp === null || OpponentCampHandoffSchema.safeParse(checkpoint.opponentCamp).success)) return checkpoint as TutorialCheckpoint;
  if (checkpoint.schemaVersion === 7 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn && checkpoint.merge) return { ...(checkpoint as TutorialCheckpointV7), schemaVersion: 8, opponentCamp: null, selectedStealTargetId: null };
  // The old 1/3/6 raid payload cannot be resumed as a 2/4/6 session. Preserve all
  // player and campaign progress, but intentionally start the raid setup fresh.
  if (checkpoint.schemaVersion === 6 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn && checkpoint.merge) return { ...(checkpoint as TutorialCheckpointV6), schemaVersion: 8, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null, raidResult: null, opponentCamp: null, selectedStealTargetId: null };
  if (checkpoint.schemaVersion === 5 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn && checkpoint.merge && checkpoint.raidDraft) return { ...(checkpoint as TutorialCheckpointV5), schemaVersion: 8, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null, raidResult: null, opponentCamp: null, selectedStealTargetId: null };
  if (checkpoint.schemaVersion === 4 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn && checkpoint.merge) return { ...(checkpoint as TutorialCheckpointV4), schemaVersion: 8, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null, raidResult: null, opponentCamp: null, selectedStealTargetId: null };
  if (checkpoint.schemaVersion === 3 && Array.isArray(checkpoint.campPlacements) && checkpoint.spawn) return { ...(checkpoint as TutorialCheckpointV3), schemaVersion: 8, merge: { appliedActionIds: [] }, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null, raidResult: null, opponentCamp: null, selectedStealTargetId: null };
  if (checkpoint.schemaVersion === 2 && Array.isArray(checkpoint.campPlacements)) return { ...(checkpoint as TutorialCheckpointV2), schemaVersion: 8, spawn: createTutorialSpawnRuntime(), merge: { appliedActionIds: [] }, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null, raidResult: null, opponentCamp: null, selectedStealTargetId: null };
  if (checkpoint.schemaVersion === 1) return { ...(checkpoint as TutorialCheckpointV1), schemaVersion: 8, campPlacements: [], spawn: createTutorialSpawnRuntime(), merge: { appliedActionIds: [] }, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null, raidResult: null, opponentCamp: null, selectedStealTargetId: null };
  return null;
}

export const localTutorialProgress: TutorialProgressRepository = {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY); if (!raw) return null;
      const migrated = migrateTutorialCheckpoint(JSON.parse(raw));
      if (migrated?.schemaVersion === 8) window.localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    } catch { return null; }
  },
  save(checkpoint) { try { window.localStorage.setItem(KEY, JSON.stringify(checkpoint)); } catch { /* storage can be unavailable */ } },
  clear() { try { window.localStorage.removeItem(KEY); } catch { /* storage can be unavailable */ } },
};
