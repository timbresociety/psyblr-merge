import type { Application, CameraComponent } from 'playcanvas';
import type { DragController } from '../interaction/DragController';
import type { SceneManager } from './SceneManager';
import type { WorldPoint } from '../world/CampCoordinateMapper';

export class InputManager {
  private canvas: HTMLCanvasElement;
  private camera: CameraComponent | null = null;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onPointerCancelBound: (e: PointerEvent | FocusEvent) => void;

  constructor(
    private app: Application,
    private dragController: DragController,
    private sceneManager: SceneManager
  ) {
    this.canvas = this.app.graphicsDevice.canvas as HTMLCanvasElement;

    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);
    this.onPointerCancelBound = this.onPointerCancel.bind(this);

    this.attach();
  }

  setCamera(camera: CameraComponent): void {
    this.camera = camera;
  }

  public screenToGround(clientX: number, clientY: number): WorldPoint | null {
    return this.pointOnGround(clientX, clientY);
  }

  private pointOnGround(clientX: number, clientY: number): WorldPoint | null {
    if (!this.camera || !this.canvas) return null;

    const bounds = this.canvas.getBoundingClientRect();
    if (
      clientX < bounds.left ||
      clientX > bounds.right ||
      clientY < bounds.top ||
      clientY > bounds.bottom
    ) {
      return null;
    }

    // PlayCanvas screenToWorld expects CSS pixel coordinates within device.clientRect (0 to bounds.width, 0 to bounds.height)
    const screenX = clientX - bounds.left;
    const screenY = clientY - bounds.top;

    const start = this.camera.screenToWorld(screenX, screenY, this.camera.nearClip);
    const end = this.camera.screenToWorld(screenX, screenY, this.camera.farClip);
    const rayY = end.y - start.y;

    if (Math.abs(rayY) < 0.0001) return null;
    const distance = -start.y / rayY;
    if (distance < 0) return null;

    return {
      x: start.x + (end.x - start.x) * distance,
      z: start.z + (end.z - start.z) * distance,
    };
  }

  private onPointerDown(e: PointerEvent): void {
    const point = this.pointOnGround(e.clientX, e.clientY);
    if (!point) return;

    this.dragController.onPointerDown(point, this.sceneManager.summons);
  }

  private onPointerMove(e: PointerEvent): void {
    const point = this.pointOnGround(e.clientX, e.clientY);
    if (!point) return;

    this.dragController.onPointerMove(point, this.sceneManager.getPlacements());
  }

  private onPointerUp(e: PointerEvent): void {
    this.dragController.onPointerUp((summon, toCell, fromCell) => {
      this.sceneManager.onSummonPlacementCommitted(summon, toCell, fromCell);
    });
  }

  private onPointerCancel(): void {
    this.dragController.cancel();
  }

  private attach(): void {
    window.addEventListener('pointerdown', this.onPointerDownBound, { passive: true });
    window.addEventListener('pointermove', this.onPointerMoveBound, { passive: true });
    window.addEventListener('pointerup', this.onPointerUpBound, { passive: true });
    window.addEventListener('pointercancel', this.onPointerCancelBound, { passive: true });
    window.addEventListener('blur', this.onPointerCancelBound, { passive: true });
  }

  destroy(): void {
    window.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);
    window.removeEventListener('pointercancel', this.onPointerCancelBound);
    window.removeEventListener('blur', this.onPointerCancelBound);
  }
}
