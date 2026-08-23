import { Application, Entity } from '@playcanvas/react';
import { Camera, Light, Render } from '@playcanvas/react/components';
import { useApp, useAppEvent, useMaterial } from '@playcanvas/react/hooks';
import { FILLMODE_FILL_WINDOW, RESOLUTION_AUTO, type CameraComponent } from 'playcanvas';
import { useCallback, useEffect, useRef } from 'react';
import { CampaignScene } from './scenes/CampaignScene';
import { BaseScene } from './scenes/BaseScene';
import { RaidScene } from './scenes/RaidScene';
import { useGameStore } from '../stores/gameStore';
import { RAID_ROUND_DEFINITIONS } from '@psyblr/game-rules';
import { worldToBattleCell } from './battlefield';
import { worldToBuildingSocket, worldToCampCell } from './baseLayout';
import { CAMERA_PRESETS, easeInOutCubic, nextCameraPreset } from './camera';
import { emitGameInteraction } from './interactionEvents';
import { projectBaseWorldTargets, publishBaseWorldTargets, publishRaidCellCenters } from './worldTargets';

const PERFORMANCE_PUBLISH_INTERVAL_SECONDS = .5;
function FramePerformanceSampler() {
  const sample = useRef({ elapsed: 0, frames: 0 });
  useAppEvent('update', useCallback((dt: number) => { const state = useGameStore.getState(); if (!state.debugOpen) { sample.current = { elapsed: 0, frames: 0 }; return; } sample.current.elapsed += Math.min(dt, .25); sample.current.frames += 1; if (sample.current.elapsed < PERFORMANCE_PUBLISH_INTERVAL_SECONDS) return; state.reportPerformance({ fps: Math.round(sample.current.frames / sample.current.elapsed), frameTimeMs: Math.round(sample.current.elapsed * 1000 / sample.current.frames * 10) / 10 }); sample.current = { elapsed: 0, frames: 0 }; }, []));
  return null;
}
function pointOnGround(camera: CameraComponent, canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const bounds = canvas.getBoundingClientRect(); if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return null;
  const screenX = (clientX - bounds.left) * canvas.width / bounds.width; const screenY = (clientY - bounds.top) * canvas.height / bounds.height;
  const start = camera.screenToWorld(screenX, screenY, camera.nearClip); const end = camera.screenToWorld(screenX, screenY, camera.farClip); const rayY = end.y - start.y;
  if (Math.abs(rayY) < .0001) return null; const distance = -start.y / rayY; return distance < 0 ? null : { x: start.x + (end.x - start.x) * distance, z: start.z + (end.z - start.z) * distance };
}
function WorldPointerBridge() {
  const app = useApp();
  useEffect(() => {
    const camera = app.root.findComponent('camera') as CameraComponent | undefined; const canvas = app.graphicsDevice.canvas as HTMLCanvasElement; if (!camera || !canvas) return;
    const resolvesCanvas = (event: PointerEvent) => document.elementFromPoint(event.clientX, event.clientY) === canvas;
    const resolve = (event: PointerEvent) => resolvesCanvas(event) ? pointOnGround(camera, canvas, event.clientX, event.clientY) : null;
    const hitsBuildingTarget = (event: PointerEvent, targetId: 'spawn-machine' | 'raid-gate') => { if (!resolvesCanvas(event)) return false; const target = projectBaseWorldTargets(camera, canvas)[targetId]; if (!target) return false; return event.clientX >= target.left && event.clientX <= target.right && event.clientY >= target.top && event.clientY <= target.bottom; };
    const onPointerDown = (event: PointerEvent) => { const state = useGameStore.getState(); if (state.scene !== 'base' || event.pointerType === 'touch') return; const point = resolve(event); const cell = point && worldToCampCell(point); const placement = cell && state.campPlacements.find((entry) => entry.cell.x === cell.x && entry.cell.y === cell.y); if (placement) state.beginCampDrag(placement.summonInstanceId); };
    const onPointerMove = (event: PointerEvent) => { const state = useGameStore.getState(); const point = resolve(event); if (state.scene === 'campaign' && state.placementMode === 'dragging') state.setHoveredBattleCell(point ? worldToBattleCell(point) : null); if (state.scene === 'raid' && state.selectedRaidSummonInstanceId) state.setHoveredRaidCell(point ? worldToBattleCell(point) : null); if (state.scene === 'base' && state.campInteractionMode === 'dragging') state.setHoveredCampCell(point ? worldToCampCell(point) : null); };
    const onPointerUp = (event: PointerEvent) => { const state = useGameStore.getState(); const point = resolve(event); if (state.scene === 'campaign') { const cell = point ? worldToBattleCell(point) : null; if (state.placementMode === 'dragging') { if (cell) state.requestPlacement(cell); else state.cancelPlacement(); return; } if (cell && state.placementMode === 'selected') state.requestPlacement(cell); else if (cell) { const placed = state.placements.find((entry) => entry.cell.x === cell.x && entry.cell.z === cell.z); if (placed) state.selectSummon(placed.summonInstanceId); } return; }
      if (state.scene === 'raid') { const round = RAID_ROUND_DEFINITIONS[state.raidRoundResults.length]; const cell = point ? worldToBattleCell(point) : null; if (!round || !cell || state.raidStatus !== 'setup') return; if (state.selectedRaidSummonInstanceId) { state.requestRaidPlacement(cell); return; } const placed = state.raidFieldPlacements[round.id].find((entry) => entry.cell.x === cell.x && entry.cell.z === cell.z); if (placed) state.selectRaidSummon(round.id, placed.summonInstanceId); return; }
      if (state.scene === 'opponentCamp') { const cell = point ? worldToCampCell(point) : null; const target = cell && state.opponentCamp?.summons.find((entry) => entry.cell.x === cell.x && entry.cell.y === cell.y); if (target) state.selectStealTarget(target.summonInstanceId); return; }
      if (state.scene !== 'base') return; if (hitsBuildingTarget(event, 'raid-gate') || (point && worldToBuildingSocket(point, 'raid_gate'))) { state.openRaidGate(); return; } if (hitsBuildingTarget(event, 'spawn-machine') || (point && worldToBuildingSocket(point, 'spawn_machine'))) { state.openSpawnMachine(); return; } const cell = point ? worldToCampCell(point) : null; if (state.campInteractionMode === 'dragging') { if (cell) state.requestCampMove(cell); else state.cancelCampInteraction(); return; } if (!cell) { state.cancelCampInteraction(); return; } if (state.campInteractionMode === 'selected') { if (state.selectedCampSummonInstanceId && state.campPlacements.find((entry) => entry.summonInstanceId === state.selectedCampSummonInstanceId)?.cell.x === cell.x && state.campPlacements.find((entry) => entry.summonInstanceId === state.selectedCampSummonInstanceId)?.cell.y === cell.y) state.cancelCampInteraction(); else state.requestCampMove(cell); return; } const placement = state.campPlacements.find((entry) => entry.cell.x === cell.x && entry.cell.y === cell.y); if (placement) state.selectCampSummon(placement.summonInstanceId);
    };
    const cancel = () => { const state = useGameStore.getState(); state.cancelPlacement(); state.cancelCampInteraction(); };
    window.addEventListener('pointerdown', onPointerDown, true); window.addEventListener('pointermove', onPointerMove, true); window.addEventListener('pointerup', onPointerUp, true); window.addEventListener('pointercancel', cancel, true); window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('pointerdown', onPointerDown, true); window.removeEventListener('pointermove', onPointerMove, true); window.removeEventListener('pointerup', onPointerUp, true); window.removeEventListener('pointercancel', cancel, true); window.removeEventListener('blur', cancel); };
  }, [app]); return null;
}
function CameraController() {
  const app = useApp(); const presetId = useGameStore((state) => state.cameraPresetId); const transitioning = useGameStore((state) => state.cameraTransitioning); const active = useRef<{ elapsed: number; fromPosition: number[]; fromRotation: number[]; fromFov: number; presetId: typeof presetId } | null>(null);
  useEffect(() => { const camera = app.root.findComponent('camera') as CameraComponent | undefined; if (!camera) return; const preset = CAMERA_PRESETS[presetId]; if (!transitioning) { camera.entity.setPosition(...preset.position); camera.entity.setEulerAngles(...preset.rotation); camera.fov = preset.fov; return; } active.current = { elapsed: 0, fromPosition: camera.entity.getPosition().toArray(), fromRotation: camera.entity.getEulerAngles().toArray(), fromFov: camera.fov, presetId }; }, [app, presetId, transitioning]);
  const publish = useCallback(() => { const camera = app.root.findComponent('camera') as CameraComponent | undefined; const canvas = app.graphicsDevice.canvas as HTMLCanvasElement; if (!camera || !canvas) return; const scene = useGameStore.getState().scene; if (scene === 'base' || scene === 'opponentCamp') publishBaseWorldTargets(camera, canvas); if (scene === 'raid') publishRaidCellCenters(camera, canvas); }, [app]);
  useEffect(() => { if (!transitioning) publish(); }, [presetId, transitioning, publish]);
  useEffect(() => { window.addEventListener('resize', publish); return () => window.removeEventListener('resize', publish); }, [publish]);
  useAppEvent('update', useCallback((dt: number) => { const task = active.current; if (!task) return; const camera = app.root.findComponent('camera') as CameraComponent | undefined; if (!camera) return; const preset = CAMERA_PRESETS[task.presetId]; task.elapsed += dt * 1000; const t = easeInOutCubic(task.elapsed / preset.durationMs); const mix = (a: number, b: number) => a + (b - a) * t; camera.entity.setPosition(mix(task.fromPosition[0]!, preset.position[0]), mix(task.fromPosition[1]!, preset.position[1]), mix(task.fromPosition[2]!, preset.position[2])); camera.entity.setEulerAngles(mix(task.fromRotation[0]!, preset.rotation[0]), mix(task.fromRotation[1]!, preset.rotation[1]), mix(task.fromRotation[2]!, preset.rotation[2])); camera.fov = mix(task.fromFov, preset.fov); if (t < 1) return; active.current = null; useGameStore.getState().setCameraTransitioning(false); const next = nextCameraPreset(task.presetId); if (next) useGameStore.getState().setCameraPreset(next); else { publish(); emitGameInteraction({ type: 'CAMERA_ARRIVED', cameraPreset: task.presetId }); } }, [app, publish]));
  return null;
}
export function GameCanvas() { const scene = useGameStore((state) => state.scene); return <div className="game-canvas" id="battle-grid-valid-cells" data-tutorial-target="battle-grid-valid-cells" data-testid="campaign-battle-grid" aria-hidden="true"><Application className="game-canvas-element" fillMode={FILLMODE_FILL_WINDOW} resolutionMode={RESOLUTION_AUTO}><FramePerformanceSampler /><WorldPointerBridge /><CameraController /><Entity name="camera" position={[0, 9, 11]} rotation={[-40, 0, 0]}><Camera clearColor="#0b1020" fov={42} nearClip={.1} farClip={100} /></Entity><Entity name="key-light" rotation={[45, 30, 0]}><Light type="directional" intensity={1.35} castShadows /></Entity><Entity name="fill-light" rotation={[-25, -70, 0]}><Light type="directional" intensity={.45} /></Entity>{scene === 'campaign' ? <CampaignScene /> : scene === 'raid' ? <RaidScene /> : <BaseScene />}</Application></div>; }
export function Ground({ scale = [16, .25, 12] as [number, number, number] }) { const material = useMaterial({ diffuse: '#101b31', gloss: .15 }); return <Entity name="ground" position={[0, -.15, 0]} scale={scale}><Render type="box" material={material} /></Entity>; }
