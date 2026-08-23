import { getSummonDefinition } from '@psyblr/game-content';
import { useGameStore } from '../stores/gameStore';

/** Compact contextual confirmation: the camp stays visible while one claim is chosen. */
export function OpponentCampOverlay() {
  const scene = useGameStore((state) => state.scene);
  const camp = useGameStore((state) => state.opponentCamp);
  const selectedId = useGameStore((state) => state.selectedStealTargetId);
  const error = useGameStore((state) => state.raidError);
  const select = useGameStore((state) => state.selectStealTarget);
  const claim = useGameStore((state) => state.claimSteal);
  const cancel = useGameStore((state) => state.cancelSteal);
  if (scene !== 'opponentCamp' || !camp) return null;
  const selected = camp.summons.find((entry) => entry.summonInstanceId === selectedId);
  const definition = selected ? getSummonDefinition(selected.definitionId) : null;
  return <aside className="opponent-camp-overlay" aria-label="Opponent camp" data-testid="opponent-camp">
    <header><span>OPPONENT CAMP</span><strong>{camp.opponent.displayName}</strong><small>ILLUMINATI IS PROTECTED · ONE RAID CLAIM</small></header>
    <div className="opponent-targets" aria-label="Opponent camp summon fallback">
      {camp.summons.map((summon) => <button key={summon.summonInstanceId} type="button" data-protected={summon.protected} data-selected={summon.summonInstanceId === selectedId} onClick={() => select(summon.summonInstanceId)}>{getSummonDefinition(summon.definitionId).displayName} · {summon.tier} {summon.protected ? '◈ PROTECTED' : 'EXPOSED'}</button>)}
    </div>
    {error && <p role="status">{error}</p>}
    {selected && definition && <section className="steal-confirm" aria-live="polite"><span>{definition.displayName} · TIER {selected.tier}</span><small>{definition.originId} · {definition.combatFunctionId}</small><b>This uses your one Raid claim.</b><div><button type="button" className="raid-start" onClick={claim}>STEAL SUMMON</button><button type="button" onClick={cancel}>CANCEL</button></div></section>}
  </aside>;
}
