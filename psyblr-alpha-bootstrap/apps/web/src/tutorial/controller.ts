import { applyTutorialEvent, createTutorialState, type TutorialEvent } from '@psyblr/tutorial-core';
import { tutorialDefinitions } from '@psyblr/game-content';
import { GAME_INTERACTION_EVENT, type GameInteraction } from '../game/interactionEvents';
import { getCampaignBattleCheckpoint, isCampaignBattlePaused, pauseCampaignBattle, resetCampaignBattleToSetup, restoreCampaignBattle, resumeCampaignBattle } from '../game/battleSession';
import { tutorialAllows, useGameStore } from '../stores/gameStore';
import { localTutorialProgress, type TutorialProgressRepository } from './persistence';

let active = false;
let repository: TutorialProgressRepository = localTutorialProgress;
let transitionTimer: number | null = null;
function save() {
  const state = useGameStore.getState();
  repository.save({ schemaVersion: 2, tutorialVersion: 1, currentStepId: state.tutorialStepId, completedStepIds: state.tutorialCompletedStepIds, context: state.tutorialContext, inventory: state.inventory, placements: state.placements, campPlacements: state.campPlacements, battle: getCampaignBattleCheckpoint() });
}
function currentState() { const state = useGameStore.getState(); return { currentStepId: state.tutorialStepId, completedStepIds: state.tutorialCompletedStepIds, context: state.tutorialContext }; }
function enterBase(replayReveal: boolean) {
  const store = useGameStore.getState();
  store.initializeBaseCamp();
  store.setSceneInternal('base');
  store.setCameraPreset(replayReveal ? 'base_reveal' : 'base_overview', replayReveal);
  save();
}
function scheduleBaseTransition() {
  if (transitionTimer !== null) window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => { transitionTimer = null; enterBase(true); }, 650);
}
function handle(event: TutorialEvent) {
  const before = currentState();
  if (event.type === 'SUMMON_PLACED' && before.currentStepId === 'campaign_place_first' && event.summonInstanceId !== before.context.firstSummonInstanceId) return;
  const next = applyTutorialEvent(before, event, tutorialDefinitions);
  if (next === before) { if (event.type === 'CAMP_SUMMON_MOVED') save(); return; }
  useGameStore.getState().setTutorial(next.currentStepId, next.completedStepIds, next.context);
  if (event.type === 'FIRST_SKILL_READY') pauseCampaignBattle();
  if (event.type === 'AUTO_CAST_ENABLED') resumeCampaignBattle();
  save();
  if (next.currentStepId === 'base_intro') scheduleBaseTransition();
}
function restoreBaseForStep(stepId: string | null) {
  if (!stepId?.startsWith('base_') && stepId !== 'spawn_open') return;
  enterBase(stepId === 'base_intro');
}
export function initializeTutorialController(progress = localTutorialProgress) {
  if (active || typeof window === 'undefined') return;
  active = true; repository = progress;
  const checkpoint = repository.load();
  if (checkpoint) {
    useGameStore.getState().restoreSetup(checkpoint.inventory, checkpoint.placements, checkpoint.campPlacements);
    useGameStore.getState().setTutorial(checkpoint.currentStepId, checkpoint.completedStepIds, checkpoint.context);
    if (checkpoint.battle) restoreCampaignBattle(checkpoint.battle);
    restoreBaseForStep(checkpoint.currentStepId);
  }
  window.addEventListener(GAME_INTERACTION_EVENT, (event: Event) => handle((event as CustomEvent<GameInteraction>).detail));
  window.addEventListener('pagehide', save);
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
}
export function continueTutorial() { if (tutorialAllows('TUTORIAL_CONTINUE')) handle({ type: 'TUTORIAL_CONTINUE' }); }
export function resetTutorial() {
  repository.clear(); resetCampaignBattleToSetup(); if (transitionTimer !== null) window.clearTimeout(transitionTimer); transitionTimer = null;
  const initial = createTutorialState('campaign_open_inventory'); const inventory = useGameStore.getState().inventory;
  useGameStore.getState().restoreSetup(inventory, [], []); useGameStore.getState().setSceneInternal('campaign'); useGameStore.getState().setCameraPreset('campaign_overview', false); useGameStore.getState().setTutorial(initial.currentStepId, initial.completedStepIds, initial.context);
}
export function retryTutorialBattle() { resetCampaignBattleToSetup(); const state = useGameStore.getState(); useGameStore.getState().setTutorial('campaign_start', state.tutorialCompletedStepIds.filter((id) => !['campaign_wait_skill', 'campaign_manual_skill', 'campaign_autocast', 'campaign_complete'].includes(id)), state.tutorialContext); save(); }
export function tutorialControllerDebug() { const state = useGameStore.getState(); return { active, stepId: state.tutorialStepId, allowed: tutorialDefinitions.find((step) => step.id === state.tutorialStepId)?.allowedActions ?? [], paused: isCampaignBattlePaused(), adapter: 'localStorage' }; }
