import { useGameStore } from '../../stores/gameStore';
import { SummonPicker } from './SummonPicker';

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
    <SummonPicker mode="campaign" inventory={inventory} selectedInstanceIds={selectedSummonInstanceId ? [selectedSummonInstanceId] : []} deployedInstanceIds={placements.map((placement) => placement.summonInstanceId)} onSelect={selectSummon} onDragStart={beginSummonDrag} onDragCancel={cancelPlacement} />
  </section>;
}
