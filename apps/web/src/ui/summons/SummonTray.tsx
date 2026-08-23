import { useGameStore } from '../../stores/gameStore';
import { SummonPicker } from './SummonPicker';

export function SummonTray() {
  const open = useGameStore((state) => state.summonTrayOpen);
  const battlePhase = useGameStore((state) => state.battlePhase);
  const tutorialStepId = useGameStore((state) => state.tutorialStepId);
  const inventory = useGameStore((state) => state.inventory);
  const placements = useGameStore((state) => state.placements);
  const selectedSummonInstanceId = useGameStore((state) => state.selectedSummonInstanceId);
  const selectSummon = useGameStore((state) => state.selectSummon);
  const beginSummonDrag = useGameStore((state) => state.beginSummonDrag);
  const cancelPlacement = useGameStore((state) => state.cancelPlacement);
  const closeSummonTray = useGameStore((state) => state.closeSummonTray);

  // After the player has learned the first placement, the roster becomes a
  // visible bench rather than a modal. This keeps the board and available
  // Summons readable at the same time, like a tactics-table setup surface.
  const persistentBench = battlePhase === 'setup' && (tutorialStepId === 'campaign_add_five' || tutorialStepId === null);
  if (!open && !persistentBench) return null;

  return <section className="summon-tray" data-persistent={persistentBench} id="summon-tray" data-tutorial-target="summon-tray" aria-label="Summon bench">
    <header className="summon-tray-header">
      <div><span>BATTLE CAMP LOADOUT</span><strong>{placements.length} / 6 DEPLOYED</strong></div>
      <button type="button" className="icon-button" onClick={closeSummonTray} aria-label="Close Summons">×</button>
    </header>
    <SummonPicker mode="campaign" inventory={inventory} selectedInstanceIds={selectedSummonInstanceId ? [selectedSummonInstanceId] : []} deployedInstanceIds={placements.map((placement) => placement.summonInstanceId)} onSelect={selectSummon} onDragStart={beginSummonDrag} onDragCancel={cancelPlacement} />
  </section>;
}
