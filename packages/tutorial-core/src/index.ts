import type { TutorialAction, TutorialStep } from '@psyblr/contracts';

export type TutorialEvent = { type: string } & Record<string, unknown>;
export type TutorialContext = { firstSummonInstanceId?: string; readySkillActorId?: string };
export type TutorialState = { currentStepId: string | null; completedStepIds: string[]; context: TutorialContext };

export function createTutorialState(initialStepId: string): TutorialState {
  return { currentStepId: initialStepId, completedStepIds: [], context: {} };
}

export function getTutorialStep(state: TutorialState, definitions: readonly TutorialStep[]): TutorialStep | null {
  return definitions.find((step) => step.id === state.currentStepId) ?? null;
}

export function isTutorialActionAllowed(state: TutorialState, action: TutorialAction, definitions: readonly TutorialStep[]): boolean {
  const step = getTutorialStep(state, definitions);
  return step === null || step.allowedActions.includes(action);
}

function eventMatches(step: TutorialStep, event: TutorialEvent): boolean {
  if (step.completionEvent !== event.type) return false;
  return Object.entries(step.completionMatch ?? {}).every(([key, value]) => event[key] === value);
}

export function applyTutorialEvent(state: TutorialState, event: TutorialEvent, definitions: readonly TutorialStep[]): TutorialState {
  const step = getTutorialStep(state, definitions);
  if (!step || !eventMatches(step, event)) return state;
  const context: TutorialContext = { ...state.context };
  if (event.type === 'SUMMON_SELECTED' && typeof event.summonInstanceId === 'string') context.firstSummonInstanceId = event.summonInstanceId;
  if (event.type === 'FIRST_SKILL_READY' && typeof event.actorId === 'string') context.readySkillActorId = event.actorId;
  return { currentStepId: step.nextStep, completedStepIds: [...new Set([...state.completedStepIds, step.id])], context };
}
