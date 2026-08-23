import { combatFunctionDefinitions, getSummonDefinition, originDefinitions } from '@psyblr/game-content';
import { resolveFormationSynergies } from '@psyblr/game-rules';
import { useGameStore } from '../stores/gameStore';

export function FormationSynergyPanel() {
  const scene = useGameStore((state) => state.scene);
  const placements = useGameStore((state) => state.placements);
  const inventory = useGameStore((state) => state.inventory);
  const raidStatus = useGameStore((state) => state.raidStatus);
  const raidFields = useGameStore((state) => state.raidFieldPlacements);
  const raidResults = useGameStore((state) => state.raidRoundResults);
  const replayRound = useGameStore((state) => state.raidReplayRoundIndex);
  if (scene !== 'campaign' && !(scene === 'raid' && (raidStatus === 'replaying' || raidStatus === 'resolving'))) return null;
  const raidUnits = scene === 'raid' ? raidResults[replayRound]?.combatSnapshot.units.filter((unit) => unit.side === 'player') ?? [] : [];
  const raidDefinitions = raidUnits.length ? raidUnits.map((unit) => getSummonDefinition(unit.definitionId)) : raidFields[['round1', 'round2', 'round3'][raidResults.length] as 'round1' | 'round2' | 'round3']?.map((placement) => inventory.find((instance) => instance.id === placement.summonInstanceId)).filter((instance): instance is NonNullable<typeof instance> => instance !== undefined).map((instance) => getSummonDefinition(instance.definitionId)) ?? [];
  const definitions = scene === 'campaign' ? placements.map((placement) => inventory.find((instance) => instance.id === placement.summonInstanceId)).filter((instance): instance is NonNullable<typeof instance> => instance !== undefined).map((instance) => getSummonDefinition(instance.definitionId)) : raidDefinitions;
  const synergies = resolveFormationSynergies(definitions, originDefinitions, combatFunctionDefinitions);
  return <aside className="synergy-panel" data-tutorial-target="synergy-panel" aria-label="Formation synergies">
    <strong>{scene === 'raid' ? 'FIELD SYNERGIES' : 'SYNERGIES'}</strong>
    {synergies.entries.map((entry) => <div key={`${entry.kind}-${entry.id}`} data-active={Boolean(entry.activeThreshold)}><span>{entry.name}</span><b>{entry.count}/{entry.activeThreshold?.count ?? entry.nextThreshold?.count ?? '—'} {entry.activeThreshold ? '✓' : ''}</b>{entry.activeThreshold && <small>{entry.activeThreshold.effect}</small>}</div>)}
  </aside>;
}
