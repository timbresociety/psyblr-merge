import { Application, Entity } from '@playcanvas/react';
import { Camera, Light, Render } from '@playcanvas/react/components';
import { useApp, useAppEvent, useMaterial } from '@playcanvas/react/hooks';
import { FILLMODE_FILL_WINDOW, RESOLUTION_AUTO, type CameraComponent } from 'playcanvas';
import { useCallback, useEffect, useRef } from 'react';
import { CampaignScene } from './scenes/CampaignScene';
import { BaseScene } from './scenes/BaseScene';
import { RaidScene } from './scenes/RaidScene';
import { useGameStore } from '../stores/gameStore';
import { worldToBattleCell } from './battlefield';

const PERFORMANCE_PUBLISH_INTERVAL_SECONDS = 0.5;

function FramePerformanceSampler() {
  const sample = useRef({ elapsed: 0, frames: 0 });
  const onUpdate = useCallback((dt: number) => {
    const state = useGameStore.getState();
    if (!state.debugOpen) {
      sample.current = { elapsed: 0, frames: 0 };
      return;
    }

    const elapsed = Math.min(dt, 0.25);
    sample.current.elapsed += elapsed;
    sample.current.frames += 1;
    if (sample.current.elapsed < PERFORMANCE_PUBLISH_INTERVAL_SECONDS) return;

    state.reportPerformance({
      fps: Math.round(sample.current.frames / sample.current.elapsed),
      frameTimeMs: Math.round((sample.current.elapsed * 1000) / sample.current.frames * 10) / 10,
    });
    sample.current = { elapsed: 0, frames: 0 };
  }, []);

  useAppEvent('update', onUpdate);
  return null;
}

function getBattleCellAtClientPoint(camera: CameraComponent, canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const bounds = canvas.getBoundingClientRect();
  if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return null;
  const screenX = (clientX - bounds.left) * canvas.offsetWidth / bounds.width;
  const screenY = (clientY - bounds.top) * canvas.offsetHeight / bounds.height;
  const rayStart = camera.screenToWorld(screenX, screenY, camera.nearClip);
  const rayEnd = camera.screenToWorld(screenX, screenY, camera.farClip);
  const rayY = rayEnd.y - rayStart.y;
  if (Math.abs(rayY) < 0.0001) return null;
  const distance = -rayStart.y / rayY;
  if (distance < 0) return null;

  return worldToBattleCell({
    x: rayStart.x + (rayEnd.x - rayStart.x) * distance,
    z: rayStart.z + (rayEnd.z - rayStart.z) * distance,
  });
}

function BattlefieldPointerBridge() {
  const app = useApp();

  useEffect(() => {
    const camera = app.root.findComponent('camera') as CameraComponent | undefined;
    const canvas = app.graphicsDevice.canvas as HTMLCanvasElement;
    if (!camera || !canvas) return;

    const resolveCell = (event: PointerEvent) => {
      if (document.elementFromPoint(event.clientX, event.clientY) !== canvas) return null;
      return getBattleCellAtClientPoint(camera, canvas, event.clientX, event.clientY);
    };
    const resolveDragCell = (event: PointerEvent) => {
      const state = useGameStore.getState();
      if (state.placementMode !== 'dragging') return null;
      const cell = resolveCell(event);
      state.setHoveredBattleCell(cell);
      return cell;
    };
    const onPointerMove = (event: PointerEvent) => { resolveDragCell(event); };
    const onPointerUp = (event: PointerEvent) => {
      const state = useGameStore.getState();
      if (state.placementMode === 'dragging') {
        const cell = resolveDragCell(event);
        if (cell) useGameStore.getState().requestPlacement(cell);
        else useGameStore.getState().cancelPlacement();
        return;
      }

      const cell = resolveCell(event);
      if (!cell) return;
      if (state.placementMode === 'selected') {
        state.requestPlacement(cell);
        return;
      }
      const placedSummon = state.placements.find((placement) => placement.cell.x === cell.x && placement.cell.z === cell.z);
      if (placedSummon) state.selectSummon(placedSummon.summonInstanceId);
    };
    const onPointerCancel = () => useGameStore.getState().cancelPlacement();

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerCancel, true);
    window.addEventListener('blur', onPointerCancel);
    return () => {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerCancel, true);
      window.removeEventListener('blur', onPointerCancel);
    };
  }, [app]);

  return null;
}

export function GameCanvas() {
  const scene = useGameStore((state) => state.scene);

  return <div className="game-canvas" id="battle-grid-valid-cells" data-tutorial-target="battle-grid-valid-cells" data-testid="campaign-battle-grid" aria-hidden="true">
    <Application
      className="game-canvas-element"
      fillMode={FILLMODE_FILL_WINDOW}
      resolutionMode={RESOLUTION_AUTO}
    >
      <FramePerformanceSampler />
      <BattlefieldPointerBridge />
      <Entity name="camera" position={[0, 9, 11]} rotation={[-40, 0, 0]}>
        <Camera clearColor="#0b1020" fov={42} nearClip={0.1} farClip={100} />
      </Entity>
      <Entity name="key-light" rotation={[45, 30, 0]}>
        <Light type="directional" intensity={1.35} castShadows />
      </Entity>
      <Entity name="fill-light" rotation={[-25, -70, 0]}>
        <Light type="directional" intensity={0.45} />
      </Entity>
      {scene === 'campaign' ? <CampaignScene /> : scene === 'base' ? <BaseScene /> : <RaidScene />}
    </Application>
  </div>;
}

export function Ground({ scale = [16, 0.25, 12] as [number, number, number] }) {
  const material = useMaterial({ diffuse: '#101b31', gloss: 0.15 });

  return <Entity name="ground" position={[0, -0.15, 0]} scale={scale}><Render type="box" material={material} /></Entity>;
}
