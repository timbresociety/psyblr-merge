export type CampaignInteractionEvent = 'INVENTORY_OPENED' | 'SUMMON_SELECTED' | 'SUMMON_DRAG_STARTED' | 'SUMMON_PLACED' | 'TEAM_SIZE_6';

export const CAMPAIGN_INTERACTION_EVENT = 'psyblr:campaign-interaction';

export function emitCampaignInteraction(type: CampaignInteractionEvent, summonInstanceId?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CAMPAIGN_INTERACTION_EVENT, { detail: { type, summonInstanceId } }));
}
