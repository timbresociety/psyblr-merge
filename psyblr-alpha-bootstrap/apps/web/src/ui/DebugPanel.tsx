import { useGameStore } from '../stores/gameStore';
import { resetTutorial, tutorialControllerDebug } from '../tutorial/controller';
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
  const battlePhase = useGameStore((state) => state.battlePhase);
  const battleTick = useGameStore((state) => state.battleTick);
  const battleEvents = useGameStore((state) => state.battleEvents);
  const readySkillActorIds = useGameStore((state) => state.readySkillActorIds);
  const autoCast = useGameStore((state) => state.autoCast);
  const battleSnapshot = useGameStore((state) => state.battleSnapshot);
  const tutorialContext = useGameStore((state) => state.tutorialContext);

  if (!debugOpen) return null;

  return <aside className="debug-panel" aria-label="Debug information" data-testid="debug-panel">
    <strong>DEV</strong>
    <dl>
      <dt>scene</dt><dd>{scene}</dd>
      <dt>tutorial</dt><dd>{tutorialStepId}</dd>
      <dt>first summon</dt><dd>{tutorialContext.firstSummonInstanceId ?? '—'}</dd>
      <dt>tutorial pause</dt><dd>{tutorialControllerDebug().paused ? 'yes' : 'no'}</dd>
      <dt>tutorial store</dt><dd>localStorage</dd>
      <dt>board</dt><dd>{boardOccupancy} / {boardCapacity}</dd>
      <dt>balls</dt><dd>{balls} / {ballCapacity}</dd>
      <dt>seed</dt><dd>{simulationSeed}</dd>
      <dt>battle</dt><dd>{battlePhase} @ {battleTick}</dd>
      <dt>events</dt><dd>{battleEvents.length}</dd>
      <dt>living</dt><dd>{battleSnapshot ? `${battleSnapshot.units.filter((unit) => unit.side === 'player').length - useGameStore.getState().deadUnitIds.filter((id) => id.startsWith('starter:')).length} / ${battleSnapshot.units.filter((unit) => unit.side === 'enemy').length - useGameStore.getState().deadUnitIds.filter((id) => id.startsWith('creep:')).length}` : '—'}</dd>
      <dt>auto</dt><dd>{autoCast ? 'on' : 'off'}</dd>
      <dt>ready</dt><dd>{readySkillActorIds.join(', ') || '—'}</dd>
      <dt>latest</dt><dd>{battleEvents.at(-1)?.type ?? '—'}</dd>
      <dt>fps</dt><dd data-testid="debug-fps">{performance.fps || 'sampling…'}</dd>
      <dt>frame</dt><dd>{performance.frameTimeMs ? `${performance.frameTimeMs} ms` : 'sampling…'}</dd>
    </dl>
    <button type="button" onClick={resetTutorial}>RESET TUTORIAL</button>
  </aside>;
}
