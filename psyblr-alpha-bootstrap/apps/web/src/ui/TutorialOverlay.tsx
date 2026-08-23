import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const cameraTransitioning = useGameStore((state) => state.cameraTransitioning);
  const context = useGameStore((state) => state.tutorialContext);
  const [rect, setRect] = useState<Rect | null>(null);
  const [worldRects, setWorldRects] = useState<Record<string, WorldTargetRect>>({});
  const cardRef = useRef<HTMLElement | null>(null);
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);
  const step = tutorialDefinitions.find((entry) => entry.id === stepId) ?? null;
  const allowsPlacement = Boolean(step?.allowedActions.includes('PLACE_SUMMON') || step?.allowedActions.includes('REPOSITION_SUMMON') || step?.allowedActions.includes('SELECT_RAID_SUMMON') || step?.allowedActions.includes('SELECT_CAMP_SUMMON') || step?.allowedActions.includes('MOVE_CAMP_SUMMON'));
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
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const update = () => {
      const next = card.getBoundingClientRect();
      setCardSize((current) => current?.width === next.width && current.height === next.height ? current : { width: next.width, height: next.height });
    };
    const observer = new ResizeObserver(update);
    observer.observe(card);
    update();
    return () => observer.disconnect();
  }, [step?.id]);
  useEffect(() => { if (rect && step?.highlightTarget) document.querySelector<HTMLElement>(`[data-tutorial-target="${step.highlightTarget}"]`)?.focus?.(); }, [rect, step?.highlightTarget]);
  if (!step || cameraTransitioning || step.id === 'campaign_wait_skill' || step.id === 'campaign_complete' || step.id === 'base_intro') return null;
  const continuation = step.allowedActions.includes('TUTORIAL_CONTINUE');
  const gameplayHint = !continuation && allowsPlacement;
  // Interaction lessons use one stable side hint so playable cells stay clear.
  const cardStyle = gameplayHint ? { left: 12, top: window.innerHeight <= 450 ? 148 : 184, width: 'min(210px, calc(100vw - 24px))', padding: '8px 10px' } : !rect && step?.id === 'raid_open' ? { left: Math.max(12, window.innerWidth - 300), top: 72 } : rect ? (() => {
    const margin = 12;
    // The card height varies with copy and viewport typography. Reserve enough
    // space for its largest tutorial variant, then let CSS scroll only if the
    // viewport is genuinely shorter than the content.
    const fallbackHeight = Math.min(220, Math.max(126, window.innerHeight - margin * 2));
    const fallbackWidth = window.innerHeight <= 450 ? 250 : 288;
    // Full-width panels reserve most of the page, but their actual copy is
    // usually short. Once measured, use that height to place the card in the
    // narrow strip above instead of covering the panel's controls.
    const isWideTarget = rect.width >= window.innerWidth * .75;
    const reservedHeight = isWideTarget && cardSize ? cardSize.height : fallbackHeight;
    const reservedWidth = isWideTarget && cardSize ? cardSize.width : fallbackWidth;
    // Raid placement needs the player-side half of the arena clear. Keep the
    // explanatory copy in the upper-right, where it does not cover blue cells.
    if (step.id === 'raid_open') return { left: Math.max(margin, window.innerWidth - reservedWidth - margin), top: Math.max(72, margin) };
    // Camp interaction remains spatial for several consecutive tutorial beats.
    // Do not chase cells or world bounds with the coach card: a stable side slot
    // prevents it from jumping across or obscuring the Camp while the player moves.
    if (step.scene === 'base' || step.scene === 'opponentCamp') return { left: margin, top: window.innerHeight <= 450 ? 148 : 184 };
    // Campaign placement uses the same lower (blue) deployment half. Keep its
    // coach card over the enemy half so valid cells remain directly tappable.
    if (step.highlightTarget === 'battle-grid-valid-cells') return { left: Math.max(margin, window.innerWidth - reservedWidth - margin), top: Math.max(72, margin) };
    // The placement tray contains the only selectable cards in this step. Keep
    // its coach card in the world space above it, even if a transient layout
    // measurement makes the generic wide-panel heuristic choose the lower lane.
    if (step.highlightTarget === 'summon-tray') {
      const height = Math.min(reservedHeight, fallbackHeight);
      // Keep loadout coaching away from the left HUD so camp/synergy labels
      // retain a stable vertical alignment with the brand.
      return { left: Math.max(margin, window.innerWidth - reservedWidth - margin), top: Math.max(72, rect.top - height - margin) };
    }
    const aboveFits = rect.top - margin >= reservedHeight;
    const belowFits = window.innerHeight - rect.bottom - margin >= reservedHeight;
    const rightFits = window.innerWidth - rect.right - margin >= reservedWidth;
    const leftFits = rect.left - margin >= reservedWidth;
    // A large world target (such as the full camp grid) can leave no clear
    // vertical lane. In that case, place the coach beside it so it never
    // intercepts the taps or drags the instruction is asking for.
    if (!aboveFits && !belowFits && (rightFits || leftFits)) {
      const left = rightFits ? rect.right + margin : rect.left - reservedWidth - margin;
      const top = Math.max(margin, Math.min(window.innerHeight - reservedHeight - margin, rect.top));
      return { left, top };
    }
    const left = Math.max(margin, Math.min(window.innerWidth - reservedWidth - margin, rect.left));
    const preferredTop = aboveFits ? rect.top - reservedHeight - margin : rect.bottom + margin;
    const top = Math.max(margin, Math.min(window.innerHeight - reservedHeight - margin, preferredTop));
    return { left, top };
  })() : undefined;
  return <div className="tutorial-layer" aria-live="polite">
    {rect && <>{!allowsPlacement && <><div className="tutorial-blocker top" style={{ height: rect.top }} /><div className="tutorial-blocker bottom" style={{ top: rect.bottom }} /><div className="tutorial-blocker left" style={{ top: rect.top, height: rect.height, width: rect.left }} /><div className="tutorial-blocker right" style={{ top: rect.top, left: rect.right, height: rect.height }} /></>}<div className="tutorial-focus" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} /></>}
    <section ref={cardRef} className={`tutorial-card${gameplayHint ? ' tutorial-gameplay-hint' : ''}`} style={cardStyle} data-continuation={continuation} data-testid="tutorial-coach">
      <span>ONBOARDING</span><strong>{step.title}</strong>{step.body && <p>{gameplayHint && step.id === 'raid_open' ? 'Drag 2 Summons onto blue cells.' : step.body}</p>}
      {continuation && <button type="button" onClick={continueTutorial}>CONTINUE</button>}
    </section>
  </div>;
}
