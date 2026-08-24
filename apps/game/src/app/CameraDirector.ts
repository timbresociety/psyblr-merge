import {
  Application,
  CameraComponent,
  Color,
  Entity,
  Vec3,
  type Layer,
} from 'playcanvas';

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
  private basePosition: Vec3;
  private baseRotation: Vec3;
  private baseFov: number;

  private impulseTrauma: number = 0;
  private impulseTime: number = 0;

  constructor(private app: Application, layers?: Layer[]) {
    this.cameraEntity = new Entity('MainCamera');
    this.basePosition = new Vec3(...BASE_CAMERA_PRESET.position);
    this.baseRotation = new Vec3(...BASE_CAMERA_PRESET.rotation);
    this.baseFov = BASE_CAMERA_PRESET.fov;

    this.cameraEntity.setPosition(this.basePosition);
    this.cameraEntity.setEulerAngles(this.baseRotation.x, this.baseRotation.y, this.baseRotation.z);

    const layerIds = layers && layers.length > 0 ? layers.map((l) => l.id) : undefined;

    this.cameraComponent = this.cameraEntity.addComponent('camera', {
      clearColor: new Color().fromString('#0b1020'),
      fov: this.baseFov,
      nearClip: 0.1,
      farClip: 100,
      ...(layerIds ? { layers: layerIds } : {}),
    }) as CameraComponent;

    this.app.root.addChild(this.cameraEntity);
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
        this.basePosition.x,
        this.basePosition.y - shakeY,
        this.basePosition.z
      );
      this.cameraEntity.setEulerAngles(
        this.baseRotation.x + shakePitch,
        this.baseRotation.y,
        this.baseRotation.z
      );

      // Exponential decay of trauma
      this.impulseTrauma = Math.max(0, this.impulseTrauma - dt * 5.0);
    } else if (this.impulseTrauma !== 0) {
      this.impulseTrauma = 0;
      this.cameraEntity.setPosition(this.basePosition);
      this.cameraEntity.setEulerAngles(this.baseRotation.x, this.baseRotation.y, this.baseRotation.z);
    }
  }

  destroy(): void {
    this.cameraEntity.destroy();
  }
}
