import type { BattlefieldPlacement, CampPlacement, SummonInstance } from '@psyblr/contracts';
import type { TutorialContext } from '@psyblr/tutorial-core';
import type { CampaignBattleCheckpoint } from '../game/battleSession';

export type TutorialCheckpoint = { schemaVersion: 2; tutorialVersion: 1; currentStepId: string | null; completedStepIds: string[]; context: TutorialContext; inventory: SummonInstance[]; placements: BattlefieldPlacement[]; campPlacements: CampPlacement[]; battle: CampaignBattleCheckpoint | null };
type TutorialCheckpointV1 = Omit<TutorialCheckpoint, 'schemaVersion' | 'campPlacements'> & { schemaVersion: 1 };
export interface TutorialProgressRepository { load(): TutorialCheckpoint | null; save(checkpoint: TutorialCheckpoint): void; clear(): void; }
const KEY = 'psyblr:tutorial:v1';

export function migrateTutorialCheckpoint(value: unknown): TutorialCheckpoint | null {
  if (!value || typeof value !== 'object') return null;
  const checkpoint = value as Partial<TutorialCheckpoint> & Partial<TutorialCheckpointV1>;
  if (checkpoint.tutorialVersion !== 1 || !Array.isArray(checkpoint.completedStepIds) || !Array.isArray(checkpoint.inventory) || !Array.isArray(checkpoint.placements) || !('battle' in checkpoint)) return null;
  if (checkpoint.schemaVersion === 2 && Array.isArray(checkpoint.campPlacements)) return checkpoint as TutorialCheckpoint;
  if (checkpoint.schemaVersion === 1) return { ...(checkpoint as TutorialCheckpointV1), schemaVersion: 2, campPlacements: [] };
  return null;
}

export const localTutorialProgress: TutorialProgressRepository = {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY); if (!raw) return null;
      const migrated = migrateTutorialCheckpoint(JSON.parse(raw));
      if (migrated?.schemaVersion === 2) window.localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    } catch { return null; }
  },
  save(checkpoint) { try { window.localStorage.setItem(KEY, JSON.stringify(checkpoint)); } catch { /* storage can be unavailable */ } },
  clear() { try { window.localStorage.removeItem(KEY); } catch { /* storage can be unavailable */ } },
};
