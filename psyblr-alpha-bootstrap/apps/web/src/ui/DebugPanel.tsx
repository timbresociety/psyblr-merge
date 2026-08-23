import { useGameStore } from '../stores/gameStore';
export function DebugPanel() {
  const debugOpen = useGameStore((state) => state.debugOpen);
  const scene = useGameStore((state) => state.scene);
  const tutorialStepId = useGameStore((state) => state.tutorialStepId);
  const boardOccupancy = useGameStore((state) => state.boardOccupancy);
  const boardCapacity = useGameStore((state) => state.boardCapacity);
  const balls = useGameStore((state) => state.balls);
  const ballCapacity = useGameStore((state) => state.ballCapacity);
  const simulationSeed = useGameStore((state) => state.simulationSeed);
  const performance = useGameStore((state) => state.performance);

  if (!debugOpen) return null;

  return <aside className="debug-panel" aria-label="Debug information" data-testid="debug-panel">
    <strong>DEV</strong>
    <dl>
      <dt>scene</dt><dd>{scene}</dd>
      <dt>tutorial</dt><dd>{tutorialStepId}</dd>
      <dt>board</dt><dd>{boardOccupancy} / {boardCapacity}</dd>
      <dt>balls</dt><dd>{balls} / {ballCapacity}</dd>
      <dt>seed</dt><dd>{simulationSeed}</dd>
      <dt>fps</dt><dd data-testid="debug-fps">{performance.fps || 'sampling…'}</dd>
      <dt>frame</dt><dd>{performance.frameTimeMs ? `${performance.frameTimeMs} ms` : 'sampling…'}</dd>
    </dl>
  </aside>;
}
