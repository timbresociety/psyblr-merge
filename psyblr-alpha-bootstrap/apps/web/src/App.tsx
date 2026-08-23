import { useEffect } from 'react';
import { GameCanvas } from './game/GameCanvas';
import { GameHud } from './ui/GameHud';
import { DebugPanel } from './ui/DebugPanel';
import { OrientationGate } from './ui/OrientationGate';
import { SummonDetailsDrawer } from './ui/summons/SummonDetailsDrawer';
import { SummonTray } from './ui/summons/SummonTray';
import { useGameStore } from './stores/gameStore';

export function App() {
  const toggleDebug = useGameStore((state) => state.toggleDebug);

  useEffect(() => {
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
    <SummonTray />
    <SummonDetailsDrawer />
    <DebugPanel />
    <OrientationGate />
  </main>;
}
