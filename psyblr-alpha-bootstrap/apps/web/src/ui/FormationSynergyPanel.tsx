import { combatFunctionDefinitions, getSummonDefinition, originDefinitions } from '@psyblr/game-content';
import { resolveFormationSynergies } from '@psyblr/game-rules';
import { useGameStore } from '../stores/gameStore';

export function FormationSynergyPanel() {
  const placements = useGameStore((state) => state.placements);
  const inventory = useGameStore((state) => state.inventory);
  const definitions = placements.map((placement) => inventory.find((instance) => instance.id === placement.summonInstanceId)).filter((instance): instance is NonNullable<typeof instance> => instance !== undefined).map((instance) => getSummonDefinition(instance.definitionId));
  const synergies = resolveFormationSynergies(definitions, originDefinitions, combatFunctionDefinitions);
  return <aside className="synergy-panel" data-tutorial-target="synergy-panel" aria-label="Formation synergies">
    <strong>SYNERGIES</strong>
    {synergies.entries.map((entry) => <div key={`${entry.kind}-${entry.id}`} data-active={Boolean(entry.activeThreshold)}><span>{entry.name}</span><b>{entry.count}/{entry.activeThreshold?.count ?? entry.nextThreshold?.count ?? '—'} {entry.activeThreshold ? '✓' : ''}</b>{entry.activeThreshold && <small>{entry.activeThreshold.effect}</small>}</div>)}
  </aside>;
}
