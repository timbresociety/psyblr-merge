import type { BattlefieldPlacement, SummonInstance } from '@psyblr/contracts';
import type { TutorialContext } from '@psyblr/tutorial-core';
import type { CampaignBattleCheckpoint } from '../game/battleSession';

export type TutorialCheckpoint = { schemaVersion: 1; tutorialVersion: 1; currentStepId: string | null; completedStepIds: string[]; context: TutorialContext; inventory: SummonInstance[]; placements: BattlefieldPlacement[]; battle: CampaignBattleCheckpoint | null };
export interface TutorialProgressRepository { load(): TutorialCheckpoint | null; save(checkpoint: TutorialCheckpoint): void; clear(): void; }
const KEY = 'psyblr:tutorial:v1';
export const localTutorialProgress: TutorialProgressRepository = {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY); if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object') return null;
      const checkpoint = value as Partial<TutorialCheckpoint>;
      if (checkpoint.schemaVersion !== 1 || checkpoint.tutorialVersion !== 1 || !Array.isArray(checkpoint.completedStepIds) || !Array.isArray(checkpoint.inventory) || !Array.isArray(checkpoint.placements) || !('battle' in checkpoint)) return null;
      return checkpoint as TutorialCheckpoint;
    } catch { return null; }
  },
  save(checkpoint) { try { window.localStorage.setItem(KEY, JSON.stringify(checkpoint)); } catch { /* storage can be unavailable */ } },
  clear() { try { window.localStorage.removeItem(KEY); } catch { /* storage can be unavailable */ } },
};
