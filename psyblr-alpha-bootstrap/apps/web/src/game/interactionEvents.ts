import type { CampCell } from '@psyblr/contracts';

export type GameInteraction =
  | { type: 'INVENTORY_OPENED' } | { type: 'SUMMON_SELECTED'; summonInstanceId: string } | { type: 'SUMMON_DRAG_STARTED'; summonInstanceId: string }
  | { type: 'SUMMON_PLACED'; summonInstanceId: string } | { type: 'TEAM_SIZE_6' } | { type: 'STATS_VIEWED'; summonInstanceId: string }
  | { type: 'SKILLS_VIEWED'; summonInstanceId: string } | { type: 'BATTLE_STARTED' } | { type: 'FIRST_SKILL_READY'; actorId: string }
  | { type: 'SKILL_1_CAST_MANUAL'; actorId: string } | { type: 'AUTO_CAST_ENABLED' } | { type: 'BATTLE_ENDED'; outcome: 'victory' | 'defeat' | 'draw' }
  | { type: 'TUTORIAL_CONTINUE' }
  | { type: 'CAMERA_ARRIVED'; cameraPreset: string }
  | { type: 'CAMP_SUMMON_SELECTED'; summonInstanceId: string }
  | { type: 'CAMP_SUMMON_MOVED'; summonInstanceId: string; from: CampCell; to: CampCell }
  | { type: 'ILLUMINATI_FULL' } | { type: 'SPAWN_UI_OPENED' } | { type: 'BALL_DROPPED' } | { type: 'CAMP_FULL' };

export const GAME_INTERACTION_EVENT = 'psyblr:game-interaction';

export function emitGameInteraction(detail: GameInteraction) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<GameInteraction>(GAME_INTERACTION_EVENT, { detail }));
}
