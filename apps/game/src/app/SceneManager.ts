import type { Application, Layer } from 'playcanvas';
import type { CampCell, CampPlacement, SummonInstance } from '@psyblr/contracts';
import { BaseWorld } from '../world/BaseWorld';
import { PachinkoWorld } from '../world/PachinkoWorld';
import { RaidWorld } from '../world/RaidWorld';
import { SummonEntity } from '../summons/SummonEntity';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { VFXDirector } from '../presentation/VFXDirector';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import { canMerge, isCampCellOccupied, moveCampSummon, nextTier } from '@psyblr/game-rules';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export class SceneManager {
  public baseWorld: BaseWorld;
  public pachinkoWorld: PachinkoWorld;
  public raidWorld: RaidWorld;
  public summons: SummonEntity[] = [];
  public roster: SummonInstance[] = [];
  private placements: CampPlacement[] = [];

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private audio: AudioDirector,
    private vfx: VFXDirector,
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
    this.raidWorld = new RaidWorld(
      this.app,
      this.motion,
      this.audio,
      this.vfx,
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
    // Check if target cell was occupied by another summon
    const existingOccupantPlacement = this.placements.find(
      (p) => p.summonInstanceId !== summon.instance.id && p.cell.x === toCell.x && p.cell.y === toCell.y
    );

    if (existingOccupantPlacement) {
      const occupantSummon = this.getSummonById(existingOccupantPlacement.summonInstanceId);

      if (occupantSummon && canMerge(summon.instance, occupantSummon.instance)) {
        // --- MERGE FLOW ---
        this.executeMerge(summon, occupantSummon, toCell);
        return;
      }

      if (occupantSummon) {
        // --- SWAP FLOW ---
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

  private executeMerge(
    consumedSummon: SummonEntity,
    targetSummon: SummonEntity,
    targetCell: CampCell
  ): void {
    const targetWorld = campCellToWorld(targetCell);

    // Cancel any active placement/landing tweens on consumed summon
    this.motion.cancel(`summon_landing_${consumedSummon.instance.id}`);
    this.motion.cancel(`summon_squash_${consumedSummon.instance.id}`);
    this.motion.cancel(`summon_move_${consumedSummon.instance.id}`);
    consumedSummon.setInteractionState('MERGING');

    // 1. Target summon squashes into anticipation
    targetSummon.playMergeAnticipation();

    // 2. Consumed summon collapses into target center
    const startX = consumedSummon.root.getPosition().x;
    const startZ = consumedSummon.root.getPosition().z;

    this.motion.tween({
      id: `merge_collapse_${consumedSummon.instance.id}`,
      from: 0,
      to: 1,
      duration: DURATION.QUICK,
      easing: EASING.SNAP,
      onUpdate: (t) => {
        const x = startX + (targetWorld[0] - startX) * t;
        const z = startZ + (targetWorld[2] - startZ) * t;
        consumedSummon.root.setPosition(x, 0.2 * (1 - t), z);
        consumedSummon.root.setLocalScale(1 - 0.8 * t, 1 - 0.8 * t, 1 - 0.8 * t);
      },
      onComplete: () => {
        // Remove and destroy consumed summon
        this.summons = this.summons.filter((s) => s !== consumedSummon);
        this.placements = this.placements.filter((p) => p.summonInstanceId !== consumedSummon.instance.id);
        this.roster = this.roster.filter((r) => r.id !== consumedSummon.instance.id);
        consumedSummon.destroy();

        // 60ms silence pocket before upgrade burst
        setTimeout(() => {
          const next = nextTier(targetSummon.instance.tier);
          if (next) {
            targetSummon.upgradeTier(next);
            // Update roster entry
            this.roster = this.roster.map((r) =>
              r.id === targetSummon.instance.id ? { ...r, tier: next } : r
            );
          }

          // Trigger explosive tier upgrade celebration
          targetSummon.playMergeUpgrade();
          this.audio.playInspectorOpen();

          this.events.emit('summonPlaced', {
            summonId: targetSummon.instance.id,
            fromCell: targetCell,
            toCell: targetCell,
            worldPosition: targetWorld,
          });
        }, 60);
      },
    });
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
    entity.setInteractionState('SPAWNING');

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
    this.raidWorld.destroy();
    this.pachinkoWorld.destroy();
    this.baseWorld.destroy();
  }
}
