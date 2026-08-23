import { getSummonDefinition } from '@psyblr/game-content';
import { TIERS, nextTier, nextTierStatDelta, resolveNextTierStats, resolveTierStats, tierFormBand } from '@psyblr/game-rules';
import { useGameStore } from '../stores/gameStore';

const FORM_LABEL = { base: 'BASE FORM', major_1: 'MAJOR FORM I', major_2: 'MAJOR FORM II', final: 'FINAL FORM' } as const;

export function TierProgressionPanel() {
  const step = useGameStore((state) => state.tutorialStepId);
  const selectedId = useGameStore((state) => state.selectedCampSummonInstanceId);
  const inventory = useGameStore((state) => state.inventory);
  const instance = inventory.find((entry) => entry.id === selectedId);
  if (step !== 'merge_to_c' || !instance) return null;
  const definition = getSummonDefinition(instance.definitionId);
  const current = resolveTierStats(definition.stats, instance.tier);
  const next = resolveNextTierStats(definition.stats, instance.tier);
  const delta = nextTierStatDelta(definition.stats, instance.tier);
  const nextTierId = nextTier(instance.tier);
  const currentIndex = TIERS.indexOf(instance.tier);
  return <aside className="tier-progress" data-tutorial-target="tier-progress" data-testid="tier-progress" aria-label={`${definition.displayName} tier progression`}>
    <header><span>PROGRESSION</span><strong>{definition.displayName} · {instance.tier}</strong><small>{FORM_LABEL[tierFormBand(instance.tier)]}</small></header>
    <div className="tier-ladder" aria-label="Tier ladder">{TIERS.map((tier, index) => <b key={tier} data-state={index < currentIndex ? 'complete' : tier === instance.tier ? 'current' : tier === nextTierId ? 'next' : 'future'}>{tier}</b>)}</div>
    <div className="form-bands" aria-label="Major forms"><span data-discovered={currentIndex >= 0}>BASE</span><span data-discovered={currentIndex >= 2}>◒ I</span><span data-discovered={currentIndex >= 5}>◒ II</span><span data-discovered={currentIndex >= 8}>◒ FINAL</span></div>
    {next && delta ? <div className="tier-delta"><strong>NEXT · {nextTierId}</strong><span>HP {current.hp.toLocaleString()} → {next.hp.toLocaleString()} (+{delta.hp.toLocaleString()})</span><span>ATK {current.atk} → {next.atk} (+{delta.atk})</span><span>DEF {current.def} → {next.def} (+{delta.def})</span><small>Attack speed, range and movement stay unchanged.</small></div> : <div className="tier-delta"><strong>MAX TIER</strong></div>}
  </aside>;
}
