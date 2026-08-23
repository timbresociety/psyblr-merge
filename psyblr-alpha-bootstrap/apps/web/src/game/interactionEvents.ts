export type CampaignInteraction =
  | { type: 'INVENTORY_OPENED' } | { type: 'SUMMON_SELECTED'; summonInstanceId: string } | { type: 'SUMMON_DRAG_STARTED'; summonInstanceId: string }
  | { type: 'SUMMON_PLACED'; summonInstanceId: string } | { type: 'TEAM_SIZE_6' } | { type: 'STATS_VIEWED'; summonInstanceId: string }
  | { type: 'SKILLS_VIEWED'; summonInstanceId: string } | { type: 'BATTLE_STARTED' } | { type: 'FIRST_SKILL_READY'; actorId: string }
  | { type: 'SKILL_1_CAST_MANUAL'; actorId: string } | { type: 'AUTO_CAST_ENABLED' } | { type: 'BATTLE_ENDED'; outcome: 'victory' | 'defeat' | 'draw' }
  | { type: 'TUTORIAL_CONTINUE' };

export const CAMPAIGN_INTERACTION_EVENT = 'psyblr:campaign-interaction';

export function emitCampaignInteraction(detail: CampaignInteraction) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CampaignInteraction>(CAMPAIGN_INTERACTION_EVENT, { detail }));
}
