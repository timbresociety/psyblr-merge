import { describe, expect, it } from 'vitest';
import type { TutorialStep } from '@psyblr/contracts';
import { applyTutorialEvent, createTutorialState, getTutorialStep, isTutorialActionAllowed } from './index';

const steps: TutorialStep[] = [
  { id: 'a', phase: 'campaign', scene: 'campaign', cameraPreset: null, title: '', body: '', highlightTarget: null, allowedActions: ['OPEN_INVENTORY'], completionEvent: 'GO', nextStep: 'b' },
  { id: 'b', phase: 'campaign', scene: 'campaign', cameraPreset: null, title: '', body: '', highlightTarget: null, allowedActions: ['TUTORIAL_CONTINUE'], completionEvent: 'TUTORIAL_CONTINUE', completionMatch: { ok: true }, nextStep: null },
  { id: 'merge', phase: 'merge', scene: 'base', cameraPreset: null, title: '', body: '', highlightTarget: null, allowedActions: ['MERGE_SUMMONS'], completionEvent: 'MERGE_COMPLETED', completionMatch: { toTier: 'C' }, nextStep: null },
];
describe('tutorial interpreter', () => {
  it('resolves and gates the initial step', () => { const state = createTutorialState('a'); expect(getTutorialStep(state, steps)?.id).toBe('a'); expect(isTutorialActionAllowed(state, 'OPEN_INVENTORY', steps)).toBe(true); expect(isTutorialActionAllowed(state, 'START_BATTLE', steps)).toBe(false); });
  it('only transitions on matching events and payload', () => { const a = createTutorialState('a'); const b = applyTutorialEvent(a, { type: 'GO' }, steps); expect(b.currentStepId).toBe('b'); expect(applyTutorialEvent(b, { type: 'TUTORIAL_CONTINUE', ok: false }, steps)).toBe(b); expect(applyTutorialEvent(b, { type: 'TUTORIAL_CONTINUE', ok: true }, steps).currentStepId).toBeNull(); });
  it('fails safe for an unknown or completed tutorial', () => { expect(isTutorialActionAllowed({ currentStepId: 'nope', completedStepIds: [], context: {} }, 'START_BATTLE', steps)).toBe(true); expect(isTutorialActionAllowed({ currentStepId: null, completedStepIds: ['a'], context: {} }, 'START_BATTLE', steps)).toBe(true); });
  it('advances the tier goal only after a C-tier merge', () => { const state = createTutorialState('merge'); expect(applyTutorialEvent(state, { type: 'MERGE_COMPLETED', toTier: 'D' }, steps)).toBe(state); expect(applyTutorialEvent(state, { type: 'MERGE_COMPLETED', toTier: 'C' }, steps).currentStepId).toBeNull(); });
});
