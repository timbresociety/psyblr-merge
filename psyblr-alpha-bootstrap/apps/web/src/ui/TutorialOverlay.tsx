import { useEffect, useLayoutEffect, useState } from 'react';
import { tutorialDefinitions } from '@psyblr/game-content';
import { useGameStore } from '../stores/gameStore';
import { continueTutorial } from '../tutorial/controller';
import { WORLD_TARGETS_EVENT, type WorldTargetRect } from '../game/worldTargets';

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
function findTarget(id: string | null, readyActorId: string | undefined): HTMLElement | null {
  const target = id === 'ready-skill-button' && readyActorId ? `battle-skill-${readyActorId}` : id;
  return target ? document.querySelector<HTMLElement>(`[data-tutorial-target="${target}"], [data-testid="${target}"]`) : null;
}
export function TutorialOverlay() {
  const stepId = useGameStore((state) => state.tutorialStepId);
  const context = useGameStore((state) => state.tutorialContext);
  const [rect, setRect] = useState<Rect | null>(null);
  const [worldRects, setWorldRects] = useState<Record<string, WorldTargetRect>>({});
  const step = tutorialDefinitions.find((entry) => entry.id === stepId) ?? null;
  const allowsPlacement = Boolean(step?.allowedActions.includes('PLACE_SUMMON') || step?.allowedActions.includes('REPOSITION_SUMMON') || step?.allowedActions.includes('SELECT_CAMP_SUMMON') || step?.allowedActions.includes('MOVE_CAMP_SUMMON'));
  useEffect(() => { const onTargets = (event: Event) => setWorldRects((event as CustomEvent<Record<string, WorldTargetRect>>).detail); window.addEventListener(WORLD_TARGETS_EVENT, onTargets); const frame = window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))); return () => { window.cancelAnimationFrame(frame); window.removeEventListener(WORLD_TARGETS_EVENT, onTargets); }; }, []);
  useLayoutEffect(() => {
    if (!step?.highlightTarget) { setRect(null); return; }
    let observer: ResizeObserver | undefined; let mutation: MutationObserver | undefined;
    const update = () => {
      const target = findTarget(step.highlightTarget, context.readySkillActorId);
      setRect(target ? target.getBoundingClientRect() : worldRects[step.highlightTarget!] ?? null);
      if (target && !observer) { observer = new ResizeObserver(update); observer.observe(target); }
    };
    update(); window.addEventListener('resize', update); mutation = new MutationObserver(update); mutation.observe(document.body, { childList: true, subtree: true });
    return () => { window.removeEventListener('resize', update); observer?.disconnect(); mutation?.disconnect(); };
  }, [step?.highlightTarget, context.readySkillActorId, worldRects]);
  useEffect(() => { if (rect && step?.highlightTarget) document.querySelector<HTMLElement>(`[data-tutorial-target="${step.highlightTarget}"]`)?.focus?.(); }, [rect, step?.highlightTarget]);
  if (!step || step.id === 'campaign_wait_skill' || step.id === 'campaign_complete' || step.id === 'base_intro') return null;
  const continuation = step.allowedActions.includes('TUTORIAL_CONTINUE');
  const cardStyle = rect ? { left: Math.max(12, Math.min(window.innerWidth - 300, rect.left)), top: rect.top > 150 ? Math.max(12, rect.top - 130) : Math.min(window.innerHeight - 126, rect.bottom + 12) } : undefined;
  return <div className="tutorial-layer" aria-live="polite">
    {rect && <>{!allowsPlacement && <><div className="tutorial-blocker top" style={{ height: rect.top }} /><div className="tutorial-blocker bottom" style={{ top: rect.bottom }} /><div className="tutorial-blocker left" style={{ top: rect.top, height: rect.height, width: rect.left }} /><div className="tutorial-blocker right" style={{ top: rect.top, left: rect.right, height: rect.height }} /></>}<div className="tutorial-focus" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} /></>}
    <section className="tutorial-card" style={cardStyle} data-testid="tutorial-coach">
      <span>ONBOARDING</span><strong>{step.title}</strong>{step.body && <p>{step.body}</p>}
      {continuation && <button type="button" onClick={continueTutorial}>CONTINUE</button>}
    </section>
  </div>;
}
