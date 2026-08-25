import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { VFXDirector } from '../presentation/VFXDirector';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import type { RaidFormationPlacement } from '@psyblr/contracts';
import { SummonPresenter } from '../summons/SummonPresenter';

export const DEFENSE_ORIGIN = [0, 0, 40] as const;
export const DEFENSE_CELL_SIZE = 1.0;
export const DEFENSE_GRID_SIZE = 8;

export class DefenseWorld {
  public root: Entity;
  public platform: Entity;
  public unitEntities: Map<string, Entity> = new Map();
  public unitPresenters: Map<string, SummonPresenter> = new Map();

  private materials: StandardMaterial[] = [];
  private summonPresenter: SummonPresenter;

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private audio: AudioDirector,
    private vfx: VFXDirector,
    private events: PresentationEventEmitter,
    private worldLayer?: Layer
  ) {
    const layerOpt = this.worldLayer ? { layers: [this.worldLayer.id] } : {};
    this.summonPresenter = new SummonPresenter(this.worldLayer);

    this.root = new Entity('Defense_World_Root');
    this.root.setPosition(DEFENSE_ORIGIN[0], DEFENSE_ORIGIN[1], DEFENSE_ORIGIN[2]);
    this.root.enabled = false;
    this.app.root.addChild(this.root);

    // 1. Platform Rim
    const rimMat = this.createMat({
      diffuse: '#4c1d95',
      emissive: '#a855f7',
      emissiveIntensity: 0.8,
      gloss: 0,
    });
    const rim = new Entity('DefensePlatformRim');
    rim.setLocalPosition(0, 0.02, 0);
    rim.setLocalScale(DEFENSE_GRID_SIZE * DEFENSE_CELL_SIZE + 0.48, 0.04, DEFENSE_GRID_SIZE * DEFENSE_CELL_SIZE + 0.48);
    rim.addComponent('render', { type: 'box', material: rimMat, castShadows: false, ...layerOpt });
    this.root.addChild(rim);

    // 2. Defense Platform (Dark Hexagonal Arena)
    const floorMat = this.createMat({
      diffuse: '#070f26',
      emissive: '#111e47',
      emissiveIntensity: 0.4,
      gloss: 0,
    });
    this.platform = new Entity('DefensePlatform');
    this.platform.setLocalPosition(0, 0.025, 0);
    this.platform.setLocalScale(DEFENSE_GRID_SIZE * DEFENSE_CELL_SIZE + 0.36, 0.04, DEFENSE_GRID_SIZE * DEFENSE_CELL_SIZE + 0.36);
    this.platform.addComponent('render', { type: 'box', material: floorMat, castShadows: false, ...layerOpt });
    this.root.addChild(this.platform);
  }

  public show(): void {
    this.root.enabled = true;
  }

  public hide(): void {
    this.root.enabled = false;
    this.clearUnits();
  }

  public setPlacements(placements: readonly RaidFormationPlacement[]): void {
    this.clearUnits();
    const layerOpt = this.worldLayer ? { layers: [this.worldLayer.id] } : {};

    for (const placement of placements) {
      const entity = new Entity(`DefenseUnit_${placement.summon.instanceId}`);
      const worldX = (placement.cell.x - 3.5) * DEFENSE_CELL_SIZE;
      const worldZ = (placement.cell.z - 3.5) * DEFENSE_CELL_SIZE;
      entity.setLocalPosition(worldX, 0.5, worldZ);

      const presenter = new SummonPresenter(this.worldLayer);
      presenter.createVisuals(placement.summon.definitionId, entity);

      this.root.addChild(entity);
      this.unitEntities.set(placement.summon.instanceId, entity);
      this.unitPresenters.set(placement.summon.instanceId, presenter);
    }
  }

  public clearUnits(): void {
    for (const entity of this.unitEntities.values()) {
      entity.destroy();
    }
    this.unitEntities.clear();
    this.unitPresenters.clear();
  }

  private createMat(params: { diffuse: string; emissive?: string; emissiveIntensity?: number; gloss?: number }): StandardMaterial {
    const mat = new StandardMaterial();
    mat.diffuse = colorFromHex(params.diffuse);
    if (params.emissive) {
      mat.emissive = colorFromHex(params.emissive);
      mat.emissiveIntensity = params.emissiveIntensity ?? 1;
    }
    mat.gloss = params.gloss ?? 0;
    mat.update();
    this.materials.push(mat);
    return mat;
  }
}
