import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import type { CampCell } from '@psyblr/contracts';
import { campCellToWorld, CAMP_CELL_SIZE } from '../world/CampCoordinateMapper';
import type { MotionDirector } from '../presentation/MotionDirector';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export class InteractionFeedback {
  private root: Entity;
  private targetTile: Entity;
  private ringIndicator: Entity;
  private tileMaterial: StandardMaterial;
  private ringMaterial: StandardMaterial;

  private currentTarget: CampCell | null = null;
  private isVisible: boolean = false;
  private pulseTimer: number = 0;

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private worldUiLayer?: Layer
  ) {
    const layerOpt = this.worldUiLayer ? { layers: [this.worldUiLayer.id] } : {};

    this.root = new Entity('InteractionFeedback_Root');
    this.root.enabled = false;
    this.app.root.addChild(this.root);

    // 1. Hovered Cell Base Tile Highlight
    this.targetTile = new Entity('TargetTileHighlight');
    this.targetTile.setLocalPosition(0, 0.01, 0);
    this.targetTile.setLocalScale(CAMP_CELL_SIZE * 0.94, 0.01, CAMP_CELL_SIZE * 0.94);

    this.tileMaterial = new StandardMaterial();
    this.tileMaterial.diffuse = new Color(0.1, 0.4, 0.8);
    this.tileMaterial.emissive = new Color(0.22, 0.65, 1.0);
    this.tileMaterial.emissiveIntensity = 0.8;
    this.tileMaterial.opacity = 0.45;
    this.tileMaterial.blendType = 2; // BLEND_ADDITIVE
    this.tileMaterial.update();

    this.targetTile.addComponent('render', {
      type: 'box',
      material: this.tileMaterial,
      ...layerOpt,
    });
    this.root.addChild(this.targetTile);

    // 2. Rune Ghost Landing Ring
    this.ringIndicator = new Entity('GhostLandingRing');
    this.ringIndicator.setLocalPosition(0, 0.015, 0);
    this.ringIndicator.setLocalScale(0.85, 0.015, 0.85);

    this.ringMaterial = new StandardMaterial();
    this.ringMaterial.diffuse = new Color(1, 1, 1);
    this.ringMaterial.emissive = new Color(0.35, 0.8, 1.0);
    this.ringMaterial.emissiveIntensity = 1.6;
    this.ringMaterial.opacity = 0.85;
    this.ringMaterial.blendType = 2; // BLEND_ADDITIVE
    this.ringMaterial.update();

    this.ringIndicator.addComponent('render', {
      type: 'cylinder',
      material: this.ringMaterial,
      ...layerOpt,
    });
    this.root.addChild(this.ringIndicator);
  }

  showTarget(cell: CampCell): void {
    const worldPos = campCellToWorld(cell);
    this.showTacticalTarget(worldPos, 'valid', cell);
  }

  showTacticalTarget(
    worldPos: [number, number, number],
    mode: 'valid' | 'swap' | 'invalid' = 'valid',
    cellKey?: any
  ): void {
    const isNew =
      !this.currentTarget ||
      this.currentTarget.x !== worldPos[0] ||
      this.currentTarget.y !== worldPos[2];
    this.currentTarget = { x: worldPos[0], y: worldPos[2] };

    // Update colors based on mode
    if (mode === 'swap') {
      this.tileMaterial.diffuse = new Color(0.8, 0.5, 0.1);
      this.tileMaterial.emissive = new Color(1.0, 0.75, 0.2);
      this.ringMaterial.emissive = new Color(1.0, 0.85, 0.3);
    } else if (mode === 'invalid') {
      this.tileMaterial.diffuse = new Color(0.8, 0.1, 0.1);
      this.tileMaterial.emissive = new Color(0.95, 0.2, 0.2);
      this.ringMaterial.emissive = new Color(1.0, 0.3, 0.3);
    } else {
      this.tileMaterial.diffuse = new Color(0.1, 0.4, 0.8);
      this.tileMaterial.emissive = new Color(0.22, 0.65, 1.0);
      this.ringMaterial.emissive = new Color(0.35, 0.8, 1.0);
    }
    this.tileMaterial.update();
    this.ringMaterial.update();

    if (!this.isVisible) {
      this.isVisible = true;
      this.root.enabled = true;
      this.root.setPosition(worldPos[0], worldPos[1], worldPos[2]);

      // Pop-in scale animation
      this.motion.tween({
        id: 'target_indicator_appear',
        from: 0.4,
        to: 1.0,
        duration: DURATION.MICRO,
        easing: EASING.SNAP,
        onUpdate: (scale) => {
          this.targetTile.setLocalScale(
            CAMP_CELL_SIZE * 0.94 * scale,
            0.01,
            CAMP_CELL_SIZE * 0.94 * scale
          );
        },
      });
    } else if (isNew) {
      // Snappy position slide/snap
      const fromPos = this.root.getPosition().clone();
      this.motion.tween({
        id: 'target_indicator_move',
        from: 0,
        to: 1,
        duration: DURATION.MICRO + 0.02,
        easing: EASING.SNAP,
        onUpdate: (t) => {
          const x = fromPos.x + (worldPos[0] - fromPos.x) * t;
          const z = fromPos.z + (worldPos[2] - fromPos.z) * t;
          this.root.setPosition(x, worldPos[1], z);
        },
      });

      // Quick pulse on cell transition
      this.ringMaterial.emissiveIntensity = 2.4;
      this.ringMaterial.update();
    }
  }

  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.currentTarget = null;
    this.root.enabled = false;
  }

  update(dt: number): void {
    if (!this.isVisible) return;
    this.pulseTimer += dt;

    // Subtle breathing pulse for ghost ring
    const pulse = Math.sin(this.pulseTimer * 5);
    const ringScale = 0.85 + pulse * 0.05;
    this.ringIndicator.setLocalScale(ringScale, 0.015, ringScale);

    this.ringMaterial.emissiveIntensity = 1.4 + pulse * 0.3;
    this.ringMaterial.update();
  }

  destroy(): void {
    this.root.destroy();
    this.tileMaterial.destroy();
    this.ringMaterial.destroy();
  }
}
