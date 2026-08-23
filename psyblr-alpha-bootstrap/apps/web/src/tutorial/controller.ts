import { applyTutorialEvent, createTutorialState, type TutorialEvent } from '@psyblr/tutorial-core';
import { createStarterSummonInstances, tutorialDefinitions } from '@psyblr/game-content';
import { GAME_INTERACTION_EVENT, type GameInteraction } from '../game/interactionEvents';
import { getCampaignBattleCheckpoint, isCampaignBattlePaused, pauseCampaignBattle, resetCampaignBattleToSetup, restoreCampaignBattle, resumeCampaignBattle } from '../game/battleSession';
import { tutorialAllows, useGameStore } from '../stores/gameStore';
import { localTutorialProgress, type TutorialProgressRepository } from './persistence';

let active = false;
let repository: TutorialProgressRepository = localTutorialProgress;
let transitionTimer: number | null = null;
function save() {
  const state = useGameStore.getState();
  repository.save({ schemaVersion: 7, tutorialVersion: 1, currentStepId: state.tutorialStepId, completedStepIds: state.tutorialCompletedStepIds, context: state.tutorialContext, inventory: state.inventory, placements: state.placements, campPlacements: state.campPlacements, spawn: state.spawn, merge: state.merge, raidDraft: state.raidDraft, raidSnapshot: state.raidSnapshot, raidResult: state.raidResult, battle: getCampaignBattleCheckpoint() });
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
function advanceMergeToCIfAlreadyEarned() {
  const state = useGameStore.getState();
  if (state.tutorialStepId !== 'merge_to_c' || !state.inventory.some((summon) => summon.tier === 'C')) return false;
  handle({ type: 'MERGE_COMPLETED', definitionId: 'existing-c-tier', sourceId: 'existing-c-tier', targetId: 'existing-c-tier', fromTier: 'D', toTier: 'C' });
  return true;
}
function handle(event: TutorialEvent) {
  const before = currentState();
  if (event.type === 'SUMMON_PLACED' && before.currentStepId === 'campaign_place_first' && event.summonInstanceId !== before.context.firstSummonInstanceId) return;
  const next = applyTutorialEvent(before, event, tutorialDefinitions);
  if (next === before) { if (event.type === 'CAMP_SUMMON_MOVED') save(); return; }
  useGameStore.getState().setTutorial(next.currentStepId, next.completedStepIds, next.context);
  if (next.currentStepId === 'spawn_open') useGameStore.getState().setCameraPreset('spawn_focus');
  if (next.currentStepId?.startsWith('merge_')) { useGameStore.getState().closeSpawnMachine(); useGameStore.getState().setCameraPreset('base_overview'); }
  if (event.type === 'FIRST_SKILL_READY') pauseCampaignBattle();
  if (event.type === 'AUTO_CAST_ENABLED') resumeCampaignBattle();
  if (advanceMergeToCIfAlreadyEarned()) return;
  save();
  if (next.currentStepId === 'base_intro') scheduleBaseTransition();
}
export function dispatchTutorialEvent(event: TutorialEvent) { handle(event); }
function restoreBaseForStep(stepId: string | null) {
  if (stepId === 'raid_open') { const store = useGameStore.getState(); store.setSceneInternal('raid'); store.setCameraPreset('raid_overview', false); return; }
  if (!stepId?.startsWith('base_') && !stepId?.startsWith('spawn_') && !stepId?.startsWith('merge_') && stepId !== 'raid_gate_open') return;
  enterBase(stepId === 'base_intro');
  if (stepId?.startsWith('spawn_')) { useGameStore.getState().setCameraPreset('spawn_focus', false); useGameStore.setState({ spawnOpen: true }); }
}
export function initializeTutorialController(progress = localTutorialProgress) {
  if (active || typeof window === 'undefined') return;
  active = true; repository = progress;
  const checkpoint = repository.load();
  if (checkpoint) {
    useGameStore.getState().restoreSetup(checkpoint.inventory, checkpoint.placements, checkpoint.campPlacements, checkpoint.spawn, checkpoint.merge, checkpoint.raidDraft, checkpoint.raidSnapshot, checkpoint.raidResult);
    useGameStore.getState().setTutorial(checkpoint.currentStepId, checkpoint.completedStepIds, checkpoint.context);
    if (checkpoint.battle) restoreCampaignBattle(checkpoint.battle);
    restoreBaseForStep(checkpoint.currentStepId);
    advanceMergeToCIfAlreadyEarned();
    // A v5 checkpoint may contain a locked action but no response (for example a refresh
    // between locking and the authority reply). Resume that exact action idempotently.
    if (checkpoint.currentStepId === 'raid_open' && (checkpoint.raidResult || checkpoint.raidSnapshot)) useGameStore.getState().retryRaid();
  }
  window.addEventListener(GAME_INTERACTION_EVENT, (event: Event) => handle((event as CustomEvent<GameInteraction>).detail));
  window.addEventListener('psyblr:raid-result-accepted', save);
  window.addEventListener('pagehide', save);
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
}
export function continueTutorial() { if (tutorialAllows('TUTORIAL_CONTINUE')) handle({ type: 'TUTORIAL_CONTINUE' }); }
export function resetTutorial() {
  repository.clear(); resetCampaignBattleToSetup(); if (transitionTimer !== null) window.clearTimeout(transitionTimer); transitionTimer = null;
  // A fresh tutorial must not inherit generated, merged, or stolen Summons
  // from the run it replaces.
  const initial = createTutorialState('campaign_open_inventory'); const inventory = createStarterSummonInstances();
  useGameStore.getState().restoreSetup(inventory, [], []); useGameStore.getState().setSceneInternal('campaign'); useGameStore.getState().setCameraPreset('campaign_overview', false); useGameStore.getState().setTutorial(initial.currentStepId, initial.completedStepIds, initial.context);
}
export function retryTutorialBattle() { resetCampaignBattleToSetup(); const state = useGameStore.getState(); useGameStore.getState().setTutorial('campaign_start', state.tutorialCompletedStepIds.filter((id) => !['campaign_wait_skill', 'campaign_manual_skill', 'campaign_autocast', 'campaign_complete'].includes(id)), state.tutorialContext); save(); }
export function tutorialControllerDebug() { const state = useGameStore.getState(); return { active, stepId: state.tutorialStepId, allowed: tutorialDefinitions.find((step) => step.id === state.tutorialStepId)?.allowedActions ?? [], paused: isCampaignBattlePaused(), adapter: 'localStorage' }; }
