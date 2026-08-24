import {
  Application,
  CameraComponent,
  Color,
  Entity,
  Vec3,
  type Layer,
} from 'playcanvas';
import type { MotionDirector } from '../presentation/MotionDirector';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export type CameraPreset = {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
};

export const BASE_CAMERA_PRESET: CameraPreset = {
  position: [0, 10.8, 12.5],
  rotation: [-42, 0, 0],
  fov: 42,
};

export class CameraDirector {
  public cameraEntity: Entity;
  public cameraComponent: CameraComponent;
  private currentBasePos: Vec3;
  private currentBaseRot: Vec3;
  private currentBaseFov: number;

  private impulseTrauma: number = 0;
  private impulseTime: number = 0;

  constructor(
    private app: Application,
    private motion?: MotionDirector,
    layers?: Layer[]
  ) {
    this.cameraEntity = new Entity('MainCamera');
    this.currentBasePos = new Vec3(...BASE_CAMERA_PRESET.position);
    this.currentBaseRot = new Vec3(...BASE_CAMERA_PRESET.rotation);
    this.currentBaseFov = BASE_CAMERA_PRESET.fov;

    this.cameraEntity.setPosition(this.currentBasePos);
    this.cameraEntity.setEulerAngles(this.currentBaseRot.x, this.currentBaseRot.y, this.currentBaseRot.z);

    const layerIds = layers && layers.length > 0 ? layers.map((l) => l.id) : undefined;

    this.cameraComponent = this.cameraEntity.addComponent('camera', {
      clearColor: new Color().fromString('#0b1020'),
      fov: this.currentBaseFov,
      nearClip: 0.1,
      farClip: 100,
      ...(layerIds ? { layers: layerIds } : {}),
    }) as CameraComponent;

    this.app.root.addChild(this.cameraEntity);
  }

  focusOnSummon(worldPosition: [number, number, number], duration: number = DURATION.FOCUS): void {
    const targetPos: [number, number, number] = [
      worldPosition[0] - 1.4,
      7.6,
      worldPosition[2] + 6.2,
    ];
    const targetRot: [number, number, number] = [-38, 0, 0];
    const targetFov = 38;

    this.transitionTo({ position: targetPos, rotation: targetRot, fov: targetFov }, duration);
  }

  returnToBaseOverview(duration: number = DURATION.FOCUS): void {
    this.transitionTo(BASE_CAMERA_PRESET, duration);
  }

  transitionTo(preset: CameraPreset, duration: number = DURATION.FOCUS): void {
    if (!this.motion) {
      this.currentBasePos.set(...preset.position);
      this.currentBaseRot.set(...preset.rotation);
      this.currentBaseFov = preset.fov;
      this.cameraComponent.fov = preset.fov;
      this.cameraEntity.setPosition(this.currentBasePos);
      this.cameraEntity.setEulerAngles(this.currentBaseRot.x, this.currentBaseRot.y, this.currentBaseRot.z);
      return;
    }

    const startPos = [this.currentBasePos.x, this.currentBasePos.y, this.currentBasePos.z];
    const startRot = [this.currentBaseRot.x, this.currentBaseRot.y, this.currentBaseRot.z];
    const startFov = this.currentBaseFov;

    this.motion.tween({
      id: 'camera_transition',
      from: 0,
      to: 1,
      duration,
      easing: EASING.CINEMATIC,
      onUpdate: (t) => {
        this.currentBasePos.set(
          startPos[0]! + (preset.position[0] - startPos[0]!) * t,
          startPos[1]! + (preset.position[1] - startPos[1]!) * t,
          startPos[2]! + (preset.position[2] - startPos[2]!) * t
        );
        this.currentBaseRot.set(
          startRot[0]! + (preset.rotation[0] - startRot[0]!) * t,
          startRot[1]! + (preset.rotation[1] - startRot[1]!) * t,
          startRot[2]! + (preset.rotation[2] - startRot[2]!) * t
        );
        this.currentBaseFov = startFov + (preset.fov - startFov) * t;
        this.cameraComponent.fov = this.currentBaseFov;

        this.cameraEntity.setPosition(this.currentBasePos);
        this.cameraEntity.setEulerAngles(this.currentBaseRot.x, this.currentBaseRot.y, this.currentBaseRot.z);
      },
    });
  }

  triggerDropImpulse(intensity: number = 0.09): void {
    this.impulseTrauma = Math.min(1.0, this.impulseTrauma + intensity);
    this.impulseTime = 0;
  }

  update(dt: number): void {
    if (this.impulseTrauma > 0.001) {
      this.impulseTime += dt * 35;
      const shakeY = Math.sin(this.impulseTime) * this.impulseTrauma * 0.18;
      const shakePitch = Math.cos(this.impulseTime * 1.2) * this.impulseTrauma * 0.35;

      this.cameraEntity.setPosition(
        this.currentBasePos.x,
        this.currentBasePos.y - shakeY,
        this.currentBasePos.z
      );
      this.cameraEntity.setEulerAngles(
        this.currentBaseRot.x + shakePitch,
        this.currentBaseRot.y,
        this.currentBaseRot.z
      );

      this.impulseTrauma = Math.max(0, this.impulseTrauma - dt * 5.0);
    } else if (this.impulseTrauma !== 0) {
      this.impulseTrauma = 0;
      this.cameraEntity.setPosition(this.currentBasePos);
      this.cameraEntity.setEulerAngles(this.currentBaseRot.x, this.currentBaseRot.y, this.currentBaseRot.z);
    }
  }

  destroy(): void {
    this.cameraEntity.destroy();
  }
}
