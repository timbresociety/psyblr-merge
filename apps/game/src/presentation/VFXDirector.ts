import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from './ColorUtils';
import type { PresentationEventEmitter } from './PresentationEvents';
import type { MotionDirector } from './MotionDirector';
import { DURATION, EASING } from './PresentationTokens';

export class VFXDirector {
  private rootEntity: Entity;

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private events?: PresentationEventEmitter,
    private fxLayer?: Layer
  ) {
    this.rootEntity = new Entity('VFX_Root');
    this.app.root.addChild(this.rootEntity);

    if (events) {
      this.attachEvents(events);
    }
  }

  private getLayerOption(): { layers?: number[] } {
    return this.fxLayer ? { layers: [this.fxLayer.id] } : {};
  }

  private attachEvents(events: PresentationEventEmitter): void {
    events.on('summonPlaced', (e) => {
      this.spawnLandingBurst(e.worldPosition, '#f59e0b');
    });

    events.on('summonGrabbed', (e) => {
      this.spawnPickupBurst(e.worldPosition, '#fbbf24');
    });
  }

  spawnBurst(position: [number, number, number], colorHex: string = '#f59e0b'): void {
    this.spawnLandingBurst(position, colorHex);
  }

  spawnLandingBurst(position: [number, number, number], colorHex: string = '#f59e0b'): void {
    const burstRoot = new Entity(`LandingBurst_${Date.now()}`);
    burstRoot.setPosition(position[0], position[1], position[2]);
    this.rootEntity.addChild(burstRoot);

    const baseColor = colorFromHex(colorHex);
    const layerOpt = this.getLayerOption();

    // 1. Expanding Ground Shockwave Ring
    const ringEntity = new Entity('ShockwaveRing');
    ringEntity.setPosition(0, 0.04, 0);
    ringEntity.setLocalScale(0.3, 0.02, 0.3);

    const ringMaterial = new StandardMaterial();
    ringMaterial.diffuse = new Color(1, 1, 1);
    ringMaterial.emissive = baseColor;
    ringMaterial.emissiveIntensity = 2.5;
    ringMaterial.opacity = 0.95;
    ringMaterial.blendType = 2; // BLEND_ADDITIVE
    ringMaterial.update();

    ringEntity.addComponent('render', {
      type: 'cylinder',
      material: ringMaterial,
      ...layerOpt,
    });
    burstRoot.addChild(ringEntity);

    // Shockwave expansion tween
    this.motion.tween({
      from: 0.3,
      to: 1.65,
      duration: DURATION.STANDARD,
      easing: EASING.SNAP,
      onUpdate: (scale, progress) => {
        ringEntity.setLocalScale(scale, 0.02 * (1 - progress), scale);
        ringMaterial.opacity = 0.95 * (1 - progress);
        ringMaterial.emissiveIntensity = 2.5 * (1 - progress);
        ringMaterial.update();
      },
    });

    // 2. Burst Spark Particles (8 radiating sparks)
    const sparkCount = 8;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const speed = 1.2 + Math.random() * 0.8;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 1.5 + Math.random() * 1.0;

      const spark = new Entity(`Spark_${i}`);
      spark.setPosition(0, 0.1, 0);
      spark.setLocalScale(0.06, 0.06, 0.06);

      const sparkMat = new StandardMaterial();
      sparkMat.diffuse = new Color(1, 1, 1);
      sparkMat.emissive = new Color(1, 0.9, 0.5);
      sparkMat.emissiveIntensity = 3.0;
      sparkMat.blendType = 2; // BLEND_ADDITIVE
      sparkMat.update();

      spark.addComponent('render', {
        type: 'box',
        material: sparkMat,
        ...layerOpt,
      });
      burstRoot.addChild(spark);

      this.motion.tween({
        from: 0,
        to: 1,
        duration: DURATION.QUICK + 0.1,
        easing: EASING.SNAP,
        onUpdate: (t, progress) => {
          // Physics arc
          const x = vx * t;
          const y = Math.max(0, vy * t - 4.9 * t * t);
          const z = vz * t;
          spark.setLocalPosition(x, y + 0.1, z);

          const scale = 0.06 * (1 - progress);
          spark.setLocalScale(scale, scale, scale);
        },
      });
    }

    // Clean up burst root after duration
    setTimeout(() => {
      burstRoot.destroy();
    }, (DURATION.STANDARD + 0.1) * 1000);
  }

  spawnPickupBurst(position: [number, number, number], colorHex: string = '#fbbf24'): void {
    const pickupRoot = new Entity(`PickupBurst_${Date.now()}`);
    pickupRoot.setPosition(position[0], position[1] + 0.05, position[2]);
    this.rootEntity.addChild(pickupRoot);

    const baseColor = colorFromHex(colorHex);
    const layerOpt = this.getLayerOption();

    const aura = new Entity('PickupAura');
    aura.setLocalScale(0.5, 0.02, 0.5);

    const mat = new StandardMaterial();
    mat.diffuse = baseColor;
    mat.emissive = baseColor;
    mat.emissiveIntensity = 2.0;
    mat.opacity = 0.8;
    mat.blendType = 2; // BLEND_ADDITIVE
    mat.update();

    aura.addComponent('render', {
      type: 'cylinder',
      material: mat,
      ...layerOpt,
    });
    pickupRoot.addChild(aura);

    this.motion.tween({
      from: 0.5,
      to: 1.1,
      duration: DURATION.QUICK,
      easing: EASING.SNAP,
      onUpdate: (scale, progress) => {
        aura.setLocalScale(scale, 0.02, scale);
        mat.opacity = 0.8 * (1 - progress);
        mat.update();
      },
      onComplete: () => {
        pickupRoot.destroy();
      },
    });
  }

  destroy(): void {
    this.rootEntity.destroy();
  }
}
