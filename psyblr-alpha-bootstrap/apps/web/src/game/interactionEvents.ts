export type CampaignInteractionEvent = 'INVENTORY_OPENED' | 'SUMMON_SELECTED' | 'SUMMON_DRAG_STARTED' | 'SUMMON_PLACED' | 'TEAM_SIZE_6' | 'BATTLE_STARTED' | 'FIRST_SKILL_READY' | 'SKILL_1_CAST_MANUAL' | 'AUTO_CAST_ENABLED' | 'BATTLE_ENDED';

export const CAMPAIGN_INTERACTION_EVENT = 'psyblr:campaign-interaction';

export function emitCampaignInteraction(type: CampaignInteractionEvent, summonInstanceId?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CAMPAIGN_INTERACTION_EVENT, { detail: { type, summonInstanceId } }));
}
