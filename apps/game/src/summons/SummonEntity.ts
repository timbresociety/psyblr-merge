import {
  Entity,
  StandardMaterial,
  type Application,
  type Layer,
} from 'playcanvas';
import type { CampCell, SummonInstance } from '@psyblr/contracts';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import { SummonPresenter } from './SummonPresenter';
import type { MotionDirector } from '../presentation/MotionDirector';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export type SummonInteractionState = 'IDLE' | 'GRABBED' | 'DRAGGING' | 'LANDING' | 'RETURNING';

export class SummonEntity {
  public root: Entity;
  private presenter: SummonPresenter;
  private bodyRoot: Entity;
  private baseRing: Entity;
  private shadowRoot: Entity;
  private ringMaterial: StandardMaterial;

  public state: SummonInteractionState = 'IDLE';
  public currentCell: CampCell;
  public instance: SummonInstance;

  // Visual offsets and positions
  private targetWorldPos: [number, number, number] = [0, 0, 0];
  private currentWorldPos: [number, number, number] = [0, 0, 0];
  private liftY: number = 0;
  private scaleMultiplier: number = 1.0;
  private squashStretchY: number = 1.0;

  // Idle animation timer
  private idleTime: number = Math.random() * Math.PI * 2;

  constructor(
    private app: Application,
    private motion: MotionDirector,
    instance: SummonInstance,
    initialCell: CampCell,
    worldLayer?: Layer
  ) {
    this.instance = instance;
    this.currentCell = { ...initialCell };

    this.root = new Entity(`Summon_${instance.id}`);
    this.app.root.addChild(this.root);

    const worldPos = campCellToWorld(this.currentCell);
    this.currentWorldPos = [...worldPos];
    this.targetWorldPos = [...worldPos];
    this.root.setPosition(worldPos[0], worldPos[1], worldPos[2]);

    this.presenter = new SummonPresenter(worldLayer);
    const visuals = this.presenter.createGokuVisuals(this.root);
    this.bodyRoot = visuals.bodyRoot;
    this.baseRing = visuals.baseRing;
    this.shadowRoot = visuals.shadowRoot;
    this.ringMaterial = visuals.ringMaterial;
  }

  setInteractionState(state: SummonInteractionState): void {
    this.state = state;
  }

  onGrabbed(): void {
    this.state = 'GRABBED';
    this.motion.cancel(`summon_move_${this.instance.id}`);

    // Smooth snappy lift tween (100–140ms)
    this.motion.tween({
      id: `summon_lift_${this.instance.id}`,
      from: this.liftY,
      to: 0.38,
      duration: DURATION.MICRO + 0.03,
      easing: EASING.SNAP,
      onUpdate: (val) => {
        this.liftY = val;
      },
    });

    // Scale expansion
    this.motion.tween({
      id: `summon_scale_${this.instance.id}`,
      from: this.scaleMultiplier,
      to: 1.08,
      duration: DURATION.MICRO + 0.03,
      easing: EASING.SNAP,
      onUpdate: (val) => {
        this.scaleMultiplier = val;
      },
    });

    // Ring brighten
    this.ringMaterial.emissiveIntensity = 2.4;
    this.ringMaterial.update();
  }

  setDragWorldPosition(x: number, z: number): void {
    this.state = 'DRAGGING';
    this.targetWorldPos[0] = x;
    this.targetWorldPos[1] = 0;
    this.targetWorldPos[2] = z;
  }

  onLanding(targetCell: CampCell, onComplete?: () => void): void {
    this.state = 'LANDING';
    this.currentCell = { ...targetCell };
    const targetWorld = campCellToWorld(targetCell);

    this.motion.cancel(`summon_move_${this.instance.id}`);
    this.motion.cancel(`summon_lift_${this.instance.id}`);
    this.motion.cancel(`summon_scale_${this.instance.id}`);

    const startX = this.currentWorldPos[0];
    const startZ = this.currentWorldPos[2];
    const startLift = this.liftY;

    // 1. Horizontal snap to cell center + Vertical landing drop
    this.motion.tween({
      id: `summon_landing_${this.instance.id}`,
      from: 0,
      to: 1,
      duration: DURATION.STANDARD,
      easing: EASING.SNAP,
      onUpdate: (t) => {
        this.currentWorldPos[0] = startX + (targetWorld[0] - startX) * t;
        this.currentWorldPos[2] = startZ + (targetWorld[2] - startZ) * t;
        this.liftY = startLift * (1 - t);
        this.scaleMultiplier = 1.08 - 0.08 * t;
      },
      onComplete: () => {
        this.currentWorldPos = [...targetWorld];
        this.targetWorldPos = [...targetWorld];
        this.liftY = 0;
        this.scaleMultiplier = 1.0;

        // 2. Authored Squash & Settle Bounce
        this.motion.tween({
          id: `summon_squash_${this.instance.id}`,
          from: 0.85,
          to: 1.0,
          duration: DURATION.QUICK,
          easing: EASING.LAND,
          onUpdate: (val) => {
            this.squashStretchY = val;
          },
          onComplete: () => {
            this.state = 'IDLE';
            this.ringMaterial.emissiveIntensity = 1.2;
            this.ringMaterial.update();
            if (onComplete) onComplete();
          },
        });
      },
    });
  }

  onReturnToOrigin(onComplete?: () => void): void {
    this.state = 'RETURNING';
    const originWorld = campCellToWorld(this.currentCell);

    this.motion.cancel(`summon_move_${this.instance.id}`);
    this.motion.cancel(`summon_lift_${this.instance.id}`);
    this.motion.cancel(`summon_scale_${this.instance.id}`);

    const startX = this.currentWorldPos[0];
    const startZ = this.currentWorldPos[2];
    const startLift = this.liftY;

    this.motion.tween({
      id: `summon_return_${this.instance.id}`,
      from: 0,
      to: 1,
      duration: DURATION.FOCUS,
      easing: EASING.SPRING,
      onUpdate: (t) => {
        this.currentWorldPos[0] = startX + (originWorld[0] - startX) * t;
        this.currentWorldPos[2] = startZ + (originWorld[2] - startZ) * t;
        this.liftY = startLift * (1 - Math.min(1, t * 1.2));
        this.scaleMultiplier = 1.08 - 0.08 * Math.min(1, t);
      },
      onComplete: () => {
        this.currentWorldPos = [...originWorld];
        this.targetWorldPos = [...originWorld];
        this.liftY = 0;
        this.scaleMultiplier = 1.0;
        this.squashStretchY = 1.0;
        this.state = 'IDLE';
        this.ringMaterial.emissiveIntensity = 1.2;
        this.ringMaterial.update();
        if (onComplete) onComplete();
      },
    });
  }

  update(dt: number): void {
    this.idleTime += dt;

    if (this.state === 'IDLE') {
      // Subtle organic breathing animation
      const breathPhase = Math.sin(this.idleTime * 2.8);
      const breathBob = (breathPhase + 1) * 0.012; // 0 to 0.024
      const breathScale = 1.0 + breathPhase * 0.015;

      this.bodyRoot.setLocalPosition(0, breathBob, 0);
      this.bodyRoot.setLocalScale(1.0, breathScale * this.squashStretchY, 1.0);

      // Subtle shadow breathing
      const shadowScale = 0.72 - breathPhase * 0.04;
      this.shadowRoot.setLocalScale(shadowScale, 0.005, shadowScale);

      // Base ring subtle light breathing
      this.ringMaterial.emissiveIntensity = 1.2 + breathPhase * 0.25;
      this.ringMaterial.update();

      // Ensure root stays anchored to cell
      this.root.setPosition(
        this.currentWorldPos[0],
        this.currentWorldPos[1],
        this.currentWorldPos[2]
      );
    } else if (this.state === 'DRAGGING' || this.state === 'GRABBED') {
      // Smooth physical drag follow interpolation
      const smoothFactor = Math.min(1, dt * 24);
      this.currentWorldPos[0] += (this.targetWorldPos[0] - this.currentWorldPos[0]) * smoothFactor;
      this.currentWorldPos[2] += (this.targetWorldPos[2] - this.currentWorldPos[2]) * smoothFactor;

      this.root.setPosition(
        this.currentWorldPos[0],
        this.currentWorldPos[1] + this.liftY,
        this.currentWorldPos[2]
      );

      // Shadow stays grounded under unit while dragged
      this.shadowRoot.setPosition(this.currentWorldPos[0], 0.025, this.currentWorldPos[2]);
      const shadowScale = Math.max(0.45, 0.72 - this.liftY * 0.35);
      this.shadowRoot.setLocalScale(shadowScale, 0.005, shadowScale);

      this.bodyRoot.setLocalPosition(0, 0, 0);
      this.bodyRoot.setLocalScale(
        this.scaleMultiplier,
        this.scaleMultiplier * this.squashStretchY,
        this.scaleMultiplier
      );
    } else {
      // LANDING / RETURNING state
      this.root.setPosition(
        this.currentWorldPos[0],
        this.currentWorldPos[1] + this.liftY,
        this.currentWorldPos[2]
      );

      this.shadowRoot.setPosition(this.currentWorldPos[0], 0.025, this.currentWorldPos[2]);
      const shadowScale = Math.max(0.45, 0.72 - this.liftY * 0.35);
      this.shadowRoot.setLocalScale(shadowScale, 0.005, shadowScale);

      this.bodyRoot.setLocalPosition(0, 0, 0);
      this.bodyRoot.setLocalScale(
        this.scaleMultiplier,
        this.scaleMultiplier * this.squashStretchY,
        this.scaleMultiplier
      );
    }
  }

  destroy(): void {
    this.motion.cancel(`summon_move_${this.instance.id}`);
    this.motion.cancel(`summon_lift_${this.instance.id}`);
    this.motion.cancel(`summon_scale_${this.instance.id}`);
    this.motion.cancel(`summon_landing_${this.instance.id}`);
    this.motion.cancel(`summon_squash_${this.instance.id}`);
    this.motion.cancel(`summon_return_${this.instance.id}`);
    this.presenter.destroy();
    this.root.destroy();
  }
}
