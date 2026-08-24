import type { Application, Layer } from 'playcanvas';
import type { CampCell, CampPlacement, SummonInstance } from '@psyblr/contracts';
import { BaseWorld } from '../world/BaseWorld';
import { PachinkoWorld } from '../world/PachinkoWorld';
import { SummonEntity } from '../summons/SummonEntity';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import { isCampCellOccupied, moveCampSummon } from '@psyblr/game-rules';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export class SceneManager {
  public baseWorld: BaseWorld;
  public pachinkoWorld: PachinkoWorld;
  public summons: SummonEntity[] = [];
  public roster: SummonInstance[] = [];
  private placements: CampPlacement[] = [];

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private audio: AudioDirector,
    private events: PresentationEventEmitter,
    private worldLayer?: Layer
  ) {
    this.baseWorld = new BaseWorld(this.app, this.worldLayer);
    this.pachinkoWorld = new PachinkoWorld(
      this.app,
      this.motion,
      this.audio,
      this.events,
      this.worldLayer
    );
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

  /**
   * Spawns a newly acquired summon from the Pachinko machine and flies it into a camp cell.
   */
  spawnAndTransferSummon(
    instance: SummonInstance,
    destinationCell: CampCell,
    startWorldPos: [number, number, number] = [6.4, 1.8, 0],
    onLanded?: (summon: SummonEntity) => void
  ): SummonEntity {
    // Add to roster if not already present
    if (!this.roster.some((r) => r.id === instance.id)) {
      this.roster.push(instance);
    }

    const entity = new SummonEntity(
      this.app,
      this.motion,
      instance,
      destinationCell,
      this.worldLayer
    );
    this.summons.push(entity);

    const destWorld = campCellToWorld(destinationCell);

    // Initial position at spawn machine
    entity.root.setPosition(startWorldPos[0], startWorldPos[1], startWorldPos[2]);
    entity.setInteractionState('DRAGGING');

    // Arc flight trajectory from Pachinko to Camp cell
    this.motion.tween({
      id: `spawn_fly_${instance.id}`,
      from: 0,
      to: 1,
      duration: DURATION.REWARD,
      easing: EASING.CINEMATIC,
      onUpdate: (t) => {
        const x = startWorldPos[0] + (destWorld[0] - startWorldPos[0]) * t;
        const z = startWorldPos[2] + (destWorld[2] - startWorldPos[2]) * t;
        // Parabolic arc height
        const arcY = startWorldPos[1] + (destWorld[1] - startWorldPos[1]) * t + 1.8 * Math.sin(t * Math.PI);

        entity.root.setPosition(x, arcY, z);
      },
      onComplete: () => {
        entity.onLanding(destinationCell);
        this.placements.push({
          summonInstanceId: instance.id,
          cell: { ...destinationCell },
        });

        this.events.emit('summonPlaced', {
          summonId: instance.id,
          fromCell: destinationCell,
          toCell: destinationCell,
          worldPosition: destWorld,
        });

        onLanded?.(entity);
      },
    });

    return entity;
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
    this.pachinkoWorld.destroy();
    this.baseWorld.destroy();
  }
}
