import { useEffect } from 'react';
import { GameCanvas } from './game/GameCanvas';
import { GameHud } from './ui/GameHud';
import { DebugPanel } from './ui/DebugPanel';
import { OrientationGate } from './ui/OrientationGate';
import { SummonDetailsDrawer } from './ui/summons/SummonDetailsDrawer';
import { SummonTray } from './ui/summons/SummonTray';
import { useGameStore } from './stores/gameStore';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { FormationSynergyPanel } from './ui/FormationSynergyPanel';
import { initializeTutorialController } from './tutorial/controller';
import { SpawnMachineOverlay } from './ui/SpawnMachineOverlay';
import { TierProgressionPanel } from './ui/TierProgressionPanel';
import { RaidSquadBuilder } from './ui/RaidSquadBuilder';
import './raid.css';
import './raid-replay.css';
import './raid-field.css';
import './tutorial-interaction.css';

export function App() {
  const toggleDebug = useGameStore((state) => state.toggleDebug);

  useEffect(() => {
    initializeTutorialController();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '`') toggleDebug();
      if (event.key === 'Escape') {
        const state = useGameStore.getState();
        if (state.summonDetailsOpen) state.closeSummonDetails();
        else if (state.summonTrayOpen) state.closeSummonTray();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleDebug]);

  return <main className="app-shell">
    <GameCanvas />
    <GameHud />
    <FormationSynergyPanel />
    <SummonTray />
    <SummonDetailsDrawer />
    <SpawnMachineOverlay />
    <TierProgressionPanel />
    <RaidSquadBuilder />
    <DebugPanel />
    <TutorialOverlay />
    <OrientationGate />
  </main>;
}
