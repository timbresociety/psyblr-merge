import { getCombatFunctionDefinition, getOriginDefinition, getSummonDefinition } from '@psyblr/game-content';
import { useGameStore } from '../../stores/gameStore';
import { SummonCard } from './SummonCard';

export function SummonTray() {
  const open = useGameStore((state) => state.summonTrayOpen);
  const inventory = useGameStore((state) => state.inventory);
  const placements = useGameStore((state) => state.placements);
  const selectedSummonInstanceId = useGameStore((state) => state.selectedSummonInstanceId);
  const selectSummon = useGameStore((state) => state.selectSummon);
  const beginSummonDrag = useGameStore((state) => state.beginSummonDrag);
  const cancelPlacement = useGameStore((state) => state.cancelPlacement);
  const closeSummonTray = useGameStore((state) => state.closeSummonTray);

  if (!open) return null;

  return <section className="summon-tray" id="summon-tray" data-tutorial-target="summon-tray" aria-label="Summon inventory">
    <header className="summon-tray-header">
      <div><span>CAMPAIGN SQUAD</span><strong>{placements.length} / 6 DEPLOYED</strong></div>
      <button type="button" className="icon-button" onClick={closeSummonTray} aria-label="Close Summons">×</button>
    </header>
    <div className="summon-card-row">
      {inventory.map((instance) => {
        try {
          const definition = getSummonDefinition(instance.definitionId);
          const origin = getOriginDefinition(definition.originId);
          const combatFunction = getCombatFunctionDefinition(definition.combatFunctionId);
          return <SummonCard
            key={instance.id}
            instance={instance}
            definition={definition}
            origin={origin}
            combatFunction={combatFunction}
            deployed={placements.some((placement) => placement.summonInstanceId === instance.id)}
            selected={selectedSummonInstanceId === instance.id}
            onSelect={selectSummon}
            onDragStart={beginSummonDrag}
            onDragCancel={cancelPlacement}
          />;
        } catch {
          return <div className="summon-card summon-card-unavailable" key={instance.id}>Unavailable summon content</div>;
        }
      })}
    </div>
  </section>;
}
