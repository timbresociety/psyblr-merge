import { applyTutorialEvent, createTutorialState, type TutorialEvent } from '@psyblr/tutorial-core';
import { tutorialDefinitions } from '@psyblr/game-content';
import { CAMPAIGN_INTERACTION_EVENT, type CampaignInteraction } from '../game/interactionEvents';
import { getCampaignBattleCheckpoint, isCampaignBattlePaused, pauseCampaignBattle, resetCampaignBattleToSetup, restoreCampaignBattle, resumeCampaignBattle } from '../game/battleSession';
import { tutorialAllows, useGameStore } from '../stores/gameStore';
import { localTutorialProgress, type TutorialProgressRepository } from './persistence';

let active = false;
let repository: TutorialProgressRepository = localTutorialProgress;
function save() {
  const state = useGameStore.getState();
  repository.save({ schemaVersion: 1, tutorialVersion: 1, currentStepId: state.tutorialStepId, completedStepIds: state.tutorialCompletedStepIds, context: state.tutorialContext, inventory: state.inventory, placements: state.placements, battle: getCampaignBattleCheckpoint() });
}
function currentState() {
  const state = useGameStore.getState();
  return { currentStepId: state.tutorialStepId, completedStepIds: state.tutorialCompletedStepIds, context: state.tutorialContext };
}
function handle(event: TutorialEvent) {
  const before = currentState();
  if (event.type === 'SUMMON_PLACED' && before.currentStepId === 'campaign_place_first' && event.summonInstanceId !== before.context.firstSummonInstanceId) return;
  const next = applyTutorialEvent(before, event, tutorialDefinitions);
  if (next === before) return;
  useGameStore.getState().setTutorial(next.currentStepId, next.completedStepIds, next.context);
  if (event.type === 'FIRST_SKILL_READY') pauseCampaignBattle();
  if (event.type === 'AUTO_CAST_ENABLED') resumeCampaignBattle();
  save();
}
export function initializeTutorialController(progress = localTutorialProgress) {
  if (active || typeof window === 'undefined') return;
  active = true; repository = progress;
  const checkpoint = repository.load();
  if (checkpoint) {
    useGameStore.getState().restoreSetup(checkpoint.inventory, checkpoint.placements);
    useGameStore.getState().setTutorial(checkpoint.currentStepId, checkpoint.completedStepIds, checkpoint.context);
    if (checkpoint.battle) restoreCampaignBattle(checkpoint.battle);
  }
  window.addEventListener(CAMPAIGN_INTERACTION_EVENT, (event: Event) => handle((event as CustomEvent<CampaignInteraction>).detail));
  window.addEventListener('pagehide', save);
}
export function continueTutorial() { if (tutorialAllows('TUTORIAL_CONTINUE')) handle({ type: 'TUTORIAL_CONTINUE' }); }
export function resetTutorial() { repository.clear(); resetCampaignBattleToSetup(); const initial = createTutorialState('campaign_open_inventory'); useGameStore.getState().restoreSetup(useGameStore.getState().inventory, []); useGameStore.getState().setTutorial(initial.currentStepId, initial.completedStepIds, initial.context); }
export function retryTutorialBattle() { resetCampaignBattleToSetup(); const state = useGameStore.getState(); useGameStore.getState().setTutorial('campaign_start', state.tutorialCompletedStepIds.filter((id) => !['campaign_wait_skill', 'campaign_manual_skill', 'campaign_autocast', 'campaign_complete'].includes(id)), state.tutorialContext); save(); }
export function tutorialControllerDebug() { const state = useGameStore.getState(); return { active, stepId: state.tutorialStepId, allowed: tutorialDefinitions.find((step) => step.id === state.tutorialStepId)?.allowedActions ?? [], paused: isCampaignBattlePaused(), adapter: 'localStorage' }; }
