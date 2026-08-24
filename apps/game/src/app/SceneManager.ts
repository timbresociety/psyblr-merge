import type { Application, Layer } from 'playcanvas';
import type { CampCell, CampPlacement, SummonInstance } from '@psyblr/contracts';
import { BaseWorld } from '../world/BaseWorld';
import { PachinkoWorld } from '../world/PachinkoWorld';
import { RaidWorld } from '../world/RaidWorld';
import { CampaignWorld } from '../world/CampaignWorld';
import { OpponentCampWorld } from '../world/OpponentCampWorld';
import { SummonEntity } from '../summons/SummonEntity';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { VFXDirector } from '../presentation/VFXDirector';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import { canMerge, moveCampSummon, nextTier } from '@psyblr/game-rules';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export class SceneManager {
  public baseWorld: BaseWorld;
  public pachinkoWorld: PachinkoWorld;
  public raidWorld: RaidWorld;
  public campaignWorld: CampaignWorld;
  public opponentCampWorld: OpponentCampWorld;

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
    this.campaignWorld = new CampaignWorld(
      this.app,
      this.motion,
      this.audio,
      this.vfx,
      this.events,
      this.worldLayer
    );
    this.opponentCampWorld = new OpponentCampWorld(
      this.app,
      this.worldLayer
    );

    this.initStarterRoster();
  }

  private initStarterRoster(): void {
    // 6 Starters with a mergeable Goku pair for tutorial
    this.roster = [
      { id: 'starter:goku:001', definitionId: 'goku', tier: 'F' },
      { id: 'starter:goku:002', definitionId: 'goku', tier: 'F' },
      { id: 'starter:naruto:003', definitionId: 'naruto', tier: 'F' },
      { id: 'starter:luffy:004', definitionId: 'luffy', tier: 'F' },
      { id: 'starter:eren:005', definitionId: 'eren', tier: 'F' },
      { id: 'starter:l:006', definitionId: 'l', tier: 'F' },
    ];

    // Initial Placements in Camp (Rows 2 & 3)
    const initialPlacements: { id: string; cell: CampCell }[] = [
      { id: 'starter:goku:001', cell: { x: 2, y: 3 } },
      { id: 'starter:goku:002', cell: { x: 3, y: 3 } },
      { id: 'starter:naruto:003', cell: { x: 1, y: 2 } },
      { id: 'starter:luffy:004', cell: { x: 4, y: 2 } },
      { id: 'starter:eren:005', cell: { x: 2, y: 2 } },
      { id: 'starter:l:006', cell: { x: 3, y: 2 } },
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
    const existingOccupantPlacement = this.placements.find(
      (p) => p.summonInstanceId !== summon.instance.id && p.cell.x === toCell.x && p.cell.y === toCell.y
    );

    if (existingOccupantPlacement) {
      const occupantSummon = this.getSummonById(existingOccupantPlacement.summonInstanceId);

      if (occupantSummon && canMerge(summon.instance, occupantSummon.instance)) {
        this.executeMerge(summon, occupantSummon, toCell);
        return;
      }

      if (occupantSummon) {
        occupantSummon.onLanding(fromCell);
      }

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
      this.placements = moveCampSummon(summon.instance.id, toCell, this.placements);
    }
  }

  private executeMerge(
    consumedSummon: SummonEntity,
    targetSummon: SummonEntity,
    targetCell: CampCell
  ): void {
    const targetWorld = campCellToWorld(targetCell);

    this.motion.cancel(`summon_landing_${consumedSummon.instance.id}`);
    this.motion.cancel(`summon_squash_${consumedSummon.instance.id}`);
    this.motion.cancel(`summon_move_${consumedSummon.instance.id}`);
    consumedSummon.setInteractionState('MERGING');

    targetSummon.playMergeAnticipation();

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
        this.summons = this.summons.filter((s) => s !== consumedSummon);
        this.placements = this.placements.filter((p) => p.summonInstanceId !== consumedSummon.instance.id);
        this.roster = this.roster.filter((r) => r.id !== consumedSummon.instance.id);
        consumedSummon.destroy();

        setTimeout(() => {
          const next = nextTier(targetSummon.instance.tier);
          if (next) {
            targetSummon.upgradeTier(next);
            this.roster = this.roster.map((r) =>
              r.id === targetSummon.instance.id ? { ...r, tier: next } : r
            );
          }

          targetSummon.playMergeUpgrade();
          this.audio.playInspectorOpen();

          this.events.emit('mergeCompleted', {
            sourceId: consumedSummon.instance.id,
            targetId: targetSummon.instance.id,
            upgradedTier: next ?? targetSummon.instance.tier,
            worldPosition: targetWorld,
          });

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

  spawnAndTransferSummon(
    instance: SummonInstance,
    destinationCell: CampCell,
    startWorldPos: [number, number, number] = [6.4, 1.8, 0],
    onLanded?: (summon: SummonEntity) => void
  ): SummonEntity {
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
    entity.root.setPosition(startWorldPos[0], startWorldPos[1], startWorldPos[2]);
    entity.setInteractionState('SPAWNING');

    this.motion.tween({
      id: `spawn_fly_${instance.id}`,
      from: 0,
      to: 1,
      duration: DURATION.REWARD,
      easing: EASING.CINEMATIC,
      onUpdate: (t) => {
        const x = startWorldPos[0] + (destWorld[0] - startWorldPos[0]) * t;
        const z = startWorldPos[2] + (destWorld[2] - startWorldPos[2]) * t;
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
    this.opponentCampWorld.destroy();
    this.campaignWorld.destroy();
    this.raidWorld.destroy();
    this.pachinkoWorld.destroy();
    this.baseWorld.destroy();
  }
}
