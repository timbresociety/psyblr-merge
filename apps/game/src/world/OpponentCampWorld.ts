import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import { CAMP_CELL_SIZE } from './CampCoordinateMapper';
import { CAMP_SIZE } from '@psyblr/game-rules';
import type { CampCell, SummonInstance } from '@psyblr/contracts';
import { SummonPresenter } from '../summons/SummonPresenter';

export const OPPONENT_CAMP_ORIGIN = [40, 0, 0] as const;

export interface OpponentSummonEntry {
  instance: SummonInstance;
  cell: CampCell;
  isProtected: boolean;
  entity: Entity;
  presenter: SummonPresenter;
}

export class OpponentCampWorld {
  public root: Entity;
  public arenaFloor: Entity;
  public illuminatiBarrier: Entity;
  public opponentSummons: OpponentSummonEntry[] = [];
  public selectedSummonId: string | null = null;

  private selectionRing: Entity | null = null;
  private materials: StandardMaterial[] = [];

  public onSummonSelected?: (summon: OpponentSummonEntry) => void;

  constructor(
    private app: Application,
    private worldLayer?: Layer
  ) {
    const layerOpt = this.worldLayer ? { layers: [this.worldLayer.id] } : {};

    this.root = new Entity('OpponentCamp_World_Root');
    this.root.setPosition(OPPONENT_CAMP_ORIGIN[0], OPPONENT_CAMP_ORIGIN[1], OPPONENT_CAMP_ORIGIN[2]);
    this.root.enabled = false;
    this.app.root.addChild(this.root);

    const campWidth = CAMP_SIZE * CAMP_CELL_SIZE;
    const campDepth = CAMP_SIZE * CAMP_CELL_SIZE;

    // 1. Camp Slab
    const slabMat = this.createMat({ diffuse: '#0f172a', emissive: '#090d16', emissiveIntensity: 0.2, gloss: 0 });
    this.arenaFloor = new Entity('OpponentCampSlab');
    this.arenaFloor.setLocalPosition(0, -0.02, 0);
    this.arenaFloor.setLocalScale(campWidth + 0.4, 0.08, campDepth + 0.4);
    this.arenaFloor.addComponent('render', { type: 'box', material: slabMat, castShadows: false, ...layerOpt });
    this.root.addChild(this.arenaFloor);

    // Inner Surface
    const arenaMat = this.createMat({ diffuse: '#1a1016', emissive: '#26101c', emissiveIntensity: 0.3, gloss: 0 });
    const surface = new Entity('OpponentSurface');
    surface.setLocalPosition(0, 0.01, 0);
    surface.setLocalScale(campWidth, 0.02, campDepth);
    surface.addComponent('render', { type: 'box', material: arenaMat, castShadows: false, ...layerOpt });
    this.root.addChild(surface);

    // Illuminati Dais (Row 0)
    const illumMat = this.createMat({ diffuse: '#451a03', emissive: '#f59e0b', emissiveIntensity: 0.5, gloss: 0 });
    const illumRow = new Entity('OpponentIlluminatiRow');
    illumRow.setLocalPosition(0, 0.018, (0 - 2.5) * CAMP_CELL_SIZE);
    illumRow.setLocalScale(campWidth - 0.06, 0.015, CAMP_CELL_SIZE - 0.06);
    illumRow.addComponent('render', { type: 'box', material: illumMat, castShadows: false, ...layerOpt });
    this.root.addChild(illumRow);

    // Glowing Impenetrable Forcefield Barrier over Illuminati Row
    const barrierMat = this.createMat({
      diffuse: '#b45309',
      emissive: '#fbbf24',
      emissiveIntensity: 1.5,
      opacity: 0.35,
      blendType: 2, // BLEND_ADDITIVE
    });
    this.illuminatiBarrier = new Entity('IlluminatiForcefield');
    this.illuminatiBarrier.setLocalPosition(0, 0.6, (0 - 2.5) * CAMP_CELL_SIZE);
    this.illuminatiBarrier.setLocalScale(campWidth - 0.02, 1.2, CAMP_CELL_SIZE - 0.02);
    this.illuminatiBarrier.addComponent('render', { type: 'box', material: barrierMat, castShadows: false, ...layerOpt });
    this.root.addChild(this.illuminatiBarrier);

    // Selection Ring Indicator
    const ringMat = this.createMat({
      diffuse: '#f59e0b',
      emissive: '#fbbf24',
      emissiveIntensity: 2.0,
      opacity: 0.8,
      blendType: 2,
    });
    this.selectionRing = new Entity('StealSelectionRing');
    this.selectionRing.setLocalScale(1.3, 0.02, 1.3);
    this.selectionRing.addComponent('render', { type: 'cylinder', material: ringMat, castShadows: false, ...layerOpt });
    this.selectionRing.enabled = false;
    this.root.addChild(this.selectionRing);

    // Grid Cell Dots
    const dotMat = this.createMat({ diffuse: '#f43f5e', emissive: '#fb7185', emissiveIntensity: 0.45, gloss: 0.8 });
    for (let x = 0; x <= CAMP_SIZE; x++) {
      for (let y = 0; y <= CAMP_SIZE; y++) {
        const lx = (x - CAMP_SIZE / 2) * CAMP_CELL_SIZE;
        const lz = (y - CAMP_SIZE / 2) * CAMP_CELL_SIZE;
        const dot = new Entity(`OppDot_${x}_${y}`);
        dot.setLocalPosition(lx, 0.024, lz);
        dot.setLocalScale(0.035, 0.008, 0.035);
        dot.addComponent('render', { type: 'box', material: dotMat, castShadows: false, ...layerOpt });
        this.root.addChild(dot);
      }
    }
  }

  private createMat(options: {
    diffuse: string;
    emissive?: string;
    emissiveIntensity?: number;
    gloss?: number;
    opacity?: number;
    blendType?: number;
  }): StandardMaterial {
    const mat = new StandardMaterial();
    mat.diffuse = new Color().fromString(options.diffuse);
    mat.specular = new Color(0, 0, 0);
    if (options.emissive) {
      mat.emissive = new Color().fromString(options.emissive);
      mat.emissiveIntensity = options.emissiveIntensity ?? 0.5;
    }
    if (options.gloss !== undefined) mat.gloss = options.gloss;
    if (options.opacity !== undefined) mat.opacity = options.opacity;
    if (options.blendType !== undefined) mat.blendType = options.blendType;
    mat.update();
    this.materials.push(mat);
    return mat;
  }

  cellToLocal(cell: CampCell): [number, number, number] {
    const halfSpan = (CAMP_SIZE - 1) / 2;
    return [
      (cell.x - halfSpan) * CAMP_CELL_SIZE,
      0.04,
      (cell.y - halfSpan) * CAMP_CELL_SIZE,
    ];
  }

  loadOpponentCamp(summons?: { id: string; defId: string; tier: string; cell: CampCell }[]): void {
    this.clearSummons();

    const sampleOpponents = summons ?? [
      // Row 0: Protected in Illuminati
      { id: 'opp:goku:01', defId: 'goku', tier: 'D', cell: { x: 2, y: 0 } },
      { id: 'opp:lelouch:02', defId: 'lelouch', tier: 'C', cell: { x: 3, y: 0 } },
      // Rows 1-5: Exposed for steal
      { id: 'opp:naruto:03', defId: 'naruto', tier: 'E', cell: { x: 1, y: 2 } },
      { id: 'opp:luffy:04', defId: 'luffy', tier: 'E', cell: { x: 4, y: 2 } },
      { id: 'opp:eren:05', defId: 'eren', tier: 'F', cell: { x: 2, y: 3 } },
      { id: 'opp:l:06', defId: 'l', tier: 'F', cell: { x: 3, y: 4 } },
    ];

    for (const item of sampleOpponents) {
      const isProtected = item.cell.y === 0;
      const unitRoot = new Entity(`OppSummon_${item.id}`);
      const lpos = this.cellToLocal(item.cell);
      unitRoot.setLocalPosition(lpos[0], lpos[1], lpos[2]);
      this.root.addChild(unitRoot);

      const presenter = new SummonPresenter(this.worldLayer);
      presenter.createVisuals(item.defId, unitRoot);

      const entry: OpponentSummonEntry = {
        instance: { id: item.id, definitionId: item.defId, tier: item.tier as any },
        cell: item.cell,
        isProtected,
        entity: unitRoot,
        presenter,
      };

      this.opponentSummons.push(entry);
    }
  }

  selectSummon(id: string): OpponentSummonEntry | null {
    const entry = this.opponentSummons.find((s) => s.instance.id === id);
    if (!entry) return null;

    if (entry.isProtected) {
      return null;
    }

    this.selectedSummonId = id;
    if (this.selectionRing) {
      const lpos = this.cellToLocal(entry.cell);
      this.selectionRing.setLocalPosition(lpos[0], 0.05, lpos[2]);
      this.selectionRing.enabled = true;
    }

    this.onSummonSelected?.(entry);
    return entry;
  }

  show(): void {
    this.root.enabled = true;
  }

  hide(): void {
    this.root.enabled = false;
    if (this.selectionRing) this.selectionRing.enabled = false;
    this.selectedSummonId = null;
  }

  clearSummons(): void {
    for (const entry of this.opponentSummons) {
      entry.entity.destroy();
      entry.presenter.destroy();
    }
    this.opponentSummons = [];
    this.selectedSummonId = null;
    if (this.selectionRing) this.selectionRing.enabled = false;
  }

  destroy(): void {
    this.clearSummons();
    for (const mat of this.materials) {
      mat.destroy();
    }
    this.materials.length = 0;
    this.root.destroy();
  }
}
