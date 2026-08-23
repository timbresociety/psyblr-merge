import { useGameStore } from '../stores/gameStore';
import { resetTutorial, tutorialControllerDebug } from '../tutorial/controller';
import { getCampCounters } from '../stores/gameStore';
export function DebugPanel() {
  const debugOpen = useGameStore((state) => state.debugOpen);
  const scene = useGameStore((state) => state.scene);
  const tutorialStepId = useGameStore((state) => state.tutorialStepId);
  const boardOccupancy = useGameStore((state) => state.boardOccupancy);
  const boardCapacity = useGameStore((state) => state.boardCapacity);
  const spawn = useGameStore((state) => state.spawn);
  const simulationSeed = useGameStore((state) => state.simulationSeed);
  const performance = useGameStore((state) => state.performance);
  const battlePhase = useGameStore((state) => state.battlePhase);
  const battleTick = useGameStore((state) => state.battleTick);
  const battleEvents = useGameStore((state) => state.battleEvents);
  const readySkillActorIds = useGameStore((state) => state.readySkillActorIds);
  const autoCast = useGameStore((state) => state.autoCast);
  const battleSnapshot = useGameStore((state) => state.battleSnapshot);
  const tutorialContext = useGameStore((state) => state.tutorialContext);
  const campPlacements = useGameStore((state) => state.campPlacements);
  const selectedCampSummonInstanceId = useGameStore((state) => state.selectedCampSummonInstanceId);
  const hoveredCampCell = useGameStore((state) => state.hoveredCampCell);
  const cameraPresetId = useGameStore((state) => state.cameraPresetId);
  const cameraTransitioning = useGameStore((state) => state.cameraTransitioning);
  const initializeBaseCamp = useGameStore((state) => state.initializeBaseCamp);
  const replaceCampPlacements = useGameStore((state) => state.replaceCampPlacements);
  const setSceneInternal = useGameStore((state) => state.setSceneInternal);
  const setCameraPreset = useGameStore((state) => state.setCameraPreset);
  const setTutorial = useGameStore((state) => state.setTutorial);
  const inventory = useGameStore((state) => state.inventory);
  const placements = useGameStore((state) => state.placements);
  const counters = getCampCounters(campPlacements);
  const starterIds = [...placements.map((entry) => entry.summonInstanceId), ...inventory.filter((entry) => entry.id.startsWith('starter:')).map((entry) => entry.id)].filter((id, index, values) => values.indexOf(id) === index).slice(0, 6);
  const setStarterRow = (y: number) => replaceCampPlacements(starterIds.map((summonInstanceId, x) => ({ summonInstanceId, cell: { x, y } })));

  if (!debugOpen) return null;

  return <aside className="debug-panel" aria-label="Debug information" data-testid="debug-panel">
    <strong>DEV</strong>
    <dl>
      <dt>scene</dt><dd>{scene}</dd>
      <dt>camera</dt><dd>{cameraPresetId}{cameraTransitioning ? ' moving' : ''}</dd>
      <dt>tutorial</dt><dd>{tutorialStepId}</dd>
      <dt>first summon</dt><dd>{tutorialContext.firstSummonInstanceId ?? '—'}</dd>
      <dt>tutorial pause</dt><dd>{tutorialControllerDebug().paused ? 'yes' : 'no'}</dd>
      <dt>tutorial store</dt><dd>localStorage</dd>
      <dt>board</dt><dd>{boardOccupancy} / {boardCapacity}</dd>
      <dt>camp</dt><dd>{counters.campOccupancy} / {counters.campCapacity}</dd>
      <dt>illum.</dt><dd>{counters.illuminatiOccupancy} / {counters.illuminatiCapacity}</dd>
      <dt>camp select</dt><dd>{selectedCampSummonInstanceId ?? '—'}</dd>
      <dt>camp hover</dt><dd>{hoveredCampCell ? `${hoveredCampCell.x},${hoveredCampCell.y}` : '—'}</dd>
      <dt>camp list</dt><dd>{campPlacements.map((entry) => `${entry.summonInstanceId}@${entry.cell.x},${entry.cell.y}`).join(' ') || '—'}</dd>
      <dt>balls</dt><dd>{spawn.balls} / {spawn.ballCapacity}</dd>
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
    <button type="button" onClick={() => { setTutorial('base_intro', [], {}); setSceneInternal('base'); initializeBaseCamp(); setCameraPreset('base_reveal'); }}>JUMP BASE INTRO</button>
    <button type="button" onClick={initializeBaseCamp}>INITIALIZE BASE CAMP</button>
    <button type="button" onClick={() => setStarterRow(3)}>RESET BASE STARTERS</button>
    <button type="button" onClick={() => setStarterRow(0)}>FILL ILLUMINATI</button>
    <button type="button" onClick={() => replaceCampPlacements([])}>CLEAR BASE CAMP</button>
    <button type="button" onClick={resetTutorial}>RESET TUTORIAL</button>
  </aside>;
}
