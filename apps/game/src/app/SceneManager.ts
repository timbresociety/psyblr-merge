import type { Application, Layer } from 'playcanvas';
import type { CampCell, CampPlacement, SummonInstance } from '@psyblr/contracts';
import { BaseWorld } from '../world/BaseWorld';
import { SummonEntity } from '../summons/SummonEntity';
import type { MotionDirector } from '../presentation/MotionDirector';
import { isCampCellOccupied, moveCampSummon } from '@psyblr/game-rules';

export class SceneManager {
  public baseWorld: BaseWorld;
  public summons: SummonEntity[] = [];
  public roster: SummonInstance[] = [];
  private placements: CampPlacement[] = [];

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private worldLayer?: Layer
  ) {
    this.baseWorld = new BaseWorld(this.app, this.worldLayer);
    this.initStarterRoster();
  }

  private initStarterRoster(): void {
    // 6 Curated Starter Summons with distinct identities
    this.roster = [
      { id: 'starter:goku:001', definitionId: 'goku', tier: 'F' },
      { id: 'starter:naruto:002', definitionId: 'naruto', tier: 'F' },
      { id: 'starter:luffy:003', definitionId: 'luffy', tier: 'F' },
      { id: 'starter:eren:004', definitionId: 'eren', tier: 'F' },
      { id: 'starter:l:005', definitionId: 'l', tier: 'F' },
      { id: 'starter:lelouch:006', definitionId: 'lelouch', tier: 'F' },
    ];

    // Initial Placements in Camp
    const initialPlacements: { id: string; cell: CampCell }[] = [
      { id: 'starter:goku:001', cell: { x: 2, y: 3 } },
      { id: 'starter:naruto:002', cell: { x: 3, y: 3 } },
      { id: 'starter:luffy:003', cell: { x: 1, y: 2 } },
      { id: 'starter:eren:004', cell: { x: 4, y: 2 } },
    ];

    for (const item of initialPlacements) {
      const instance = this.roster.find((r) => r.id === item.id);
      if (!instance) continue;

      const entity = new SummonEntity(
        this.app,
        this.motion,
        instance,
        item.cell,
        this.worldLayer
      );
      this.summons.push(entity);
      this.placements.push({
        summonInstanceId: instance.id,
        cell: item.cell,
      });
    }
  }

  getPlacements(): readonly CampPlacement[] {
    return this.placements;
  }

  getSummonById(id: string): SummonEntity | undefined {
    return this.summons.find((s) => s.instance.id === id);
  }

  onSummonPlacementCommitted(
    summon: SummonEntity,
    toCell: CampCell,
    fromCell: CampCell
  ): void {
    // Check if target cell was occupied by another summon (SWAP)
    const existingOccupantPlacement = this.placements.find(
      (p) => p.summonInstanceId !== summon.instance.id && p.cell.x === toCell.x && p.cell.y === toCell.y
    );

    if (existingOccupantPlacement) {
      const occupantSummon = this.getSummonById(existingOccupantPlacement.summonInstanceId);
      if (occupantSummon) {
        // Swap: existing occupant lands on the previous cell
        occupantSummon.onLanding(fromCell);
      }

      // Update placements for both
      this.placements = this.placements.map((p) => {
        if (p.summonInstanceId === summon.instance.id) {
          return { ...p, cell: { ...toCell } };
        }
        if (p.summonInstanceId === existingOccupantPlacement.summonInstanceId) {
          return { ...p, cell: { ...fromCell } };
        }
        return p;
      });
    } else {
      // Normal move
      this.placements = moveCampSummon(summon.instance.id, toCell, this.placements);
    }
  }

  update(dt: number): void {
    this.baseWorld.update(dt);
    for (const summon of this.summons) {
      summon.update(dt);
    }
  }

  destroy(): void {
    for (const summon of this.summons) {
      summon.destroy();
    }
    this.summons.length = 0;
    this.baseWorld.destroy();
  }
}
