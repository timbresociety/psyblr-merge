import type { Application, Layer } from 'playcanvas';
import type { CampCell, CampPlacement, SummonInstance } from '@psyblr/contracts';
import { BaseWorld } from '../world/BaseWorld';
import { PachinkoWorld } from '../world/PachinkoWorld';
import { RaidWorld } from '../world/RaidWorld';
import { CampaignWorld } from '../world/CampaignWorld';
import { DefenseWorld } from '../world/DefenseWorld';
import { OpponentCampWorld } from '../world/OpponentCampWorld';
import { SummonEntity } from '../summons/SummonEntity';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { VFXDirector } from '../presentation/VFXDirector';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import {
  canMerge,
  moveCampSummon,
  nextTier,
  isCampCellOccupied,
  findFirstExposedCampCell,
  canPlaceCampSummon,
  CAMP_CAPACITY,
} from '@psyblr/game-rules';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export class SceneManager {
  public baseWorld: BaseWorld;
  public pachinkoWorld: PachinkoWorld;
  public raidWorld: RaidWorld;
  public campaignWorld: CampaignWorld;
  public defenseWorld: DefenseWorld;
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
    this.defenseWorld = new DefenseWorld(
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
    if (this.loadPersistedState()) {
      return;
    }
    this.createDefaultStarters();
    this.saveState();
  }

  private createDefaultStarters(): void {
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
      this.placements.push({ summonInstanceId: instance.id, cell: item.cell });
    }
  }

  public loadPersistedState(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedRoster = localStorage.getItem('psyblr_roster');
        const savedPlacements = localStorage.getItem('psyblr_placements');
        if (savedRoster && savedPlacements) {
          const parsedRoster: SummonInstance[] = JSON.parse(savedRoster);
          const parsedPlacements: CampPlacement[] = JSON.parse(savedPlacements);
          if (Array.isArray(parsedRoster) && parsedRoster.length > 0 && Array.isArray(parsedPlacements)) {
            this.roster = parsedRoster;
            this.placements = parsedPlacements;
            for (const placement of this.placements) {
              const instance = this.roster.find((r) => r.id === placement.summonInstanceId);
              if (!instance) continue;
              const entity = new SummonEntity(
                this.app,
                this.motion,
                instance,
                placement.cell,
                this.worldLayer
              );
              this.summons.push(entity);
            }
            return true;
          }
        }
      }
    } catch {
      // Fallback to fresh starters
    }
    return false;
  }

  public saveState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('psyblr_roster', JSON.stringify(this.roster));
        localStorage.setItem('psyblr_placements', JSON.stringify(this.placements));
      }
    } catch {
      // Ignore
    }
  }

  public resetToStarters(): void {
    for (const summon of this.summons) {
      summon.destroy();
    }
    this.summons = [];
    this.roster = [];
    this.placements = [];
    this.createDefaultStarters();
    this.saveState();
  }

  public getPlacements(): readonly CampPlacement[] {
    return this.placements;
  }

  public getSummonAtCell(cell: CampCell, excludeSummonId?: string): SummonEntity | undefined {
    const placement = this.placements.find(
      (p) => (!excludeSummonId || p.summonInstanceId !== excludeSummonId) && p.cell.x === cell.x && p.cell.y === cell.y
    );
    if (placement) {
      return this.getSummonById(placement.summonInstanceId);
    }
    return this.summons.find(
      (s) => (!excludeSummonId || s.instance.id !== excludeSummonId) && s.currentCell.x === cell.x && s.currentCell.y === cell.y
    );
  }

  public getSummonById(id: string): SummonEntity | undefined {
    return this.summons.find((s) => s.instance.id === id);
  }

  public onSummonPlacementCommitted(summon: SummonEntity | string, toCell: CampCell, fromCell?: CampCell): void {
    const source = typeof summon === 'string' ? this.getSummonById(summon) : summon;
    if (!source) return;

    const sourcePlacement = this.placements.find((p) => p.summonInstanceId === source.instance.id);
    const originCell: CampCell = fromCell ?? sourcePlacement?.cell ?? { ...source.currentCell };

    // If dropped back on the origin cell, settle cleanly
    if (originCell.x === toCell.x && originCell.y === toCell.y) {
      source.onLanding(originCell);
      return;
    }

    // Find if another summon is occupying toCell
    const targetSummon = this.getSummonAtCell(toCell, source.instance.id);

    if (targetSummon) {
      if (canMerge(source.instance, targetSummon.instance)) {
        this.handleMerge(source.instance.id, targetSummon.instance.id);
        return;
      }
      // Swap positions if different identity/tier
      this.placements = this.placements.map((p) => {
        if (p.summonInstanceId === source.instance.id) return { ...p, cell: { ...toCell } };
        if (p.summonInstanceId === targetSummon.instance.id) return { ...p, cell: { ...originCell } };
        return p;
      });
      this.saveState();
      source.onLanding(toCell);
      targetSummon.onLanding(originCell);
      return;
    }

    // Move summon to empty cell
    const moved = this.moveSummon(source.instance.id, toCell);
    if (!moved) {
      source.onLanding(originCell);
    }
  }

  public moveSummon(summonId: string, targetCell: CampCell): boolean {
    const summon = this.getSummonById(summonId);
    if (!summon) return false;

    if (!canPlaceCampSummon(summonId, targetCell, this.placements)) {
      return false;
    }

    const prevCell = { ...summon.currentCell };
    this.placements = moveCampSummon(summonId, targetCell, this.placements);
    this.saveState();
    summon.onLanding(targetCell);

    this.events.emit('summonPlaced', {
      summonId,
      fromCell: prevCell,
      toCell: targetCell,
      worldPosition: campCellToWorld(targetCell),
    });

    return true;
  }

  public removeSummon(summonId: string): void {
    const summon = this.getSummonById(summonId);
    if (summon) {
      summon.destroy();
      this.summons = this.summons.filter((s) => s.instance.id !== summonId);
    }
    this.roster = this.roster.filter((r) => r.id !== summonId);
    this.placements = this.placements.filter((p) => p.summonInstanceId !== summonId);
    this.saveState();
  }

  public handleMerge(sourceId: string, targetId: string): boolean {
    const source = this.getSummonById(sourceId);
    const target = this.getSummonById(targetId);

    if (!source || !target) return false;
    if (!canMerge(source.instance, target.instance)) return false;

    const next = nextTier(target.instance.tier);
    if (!next) return false;

    // Execute merge
    target.upgradeTier(next);
    target.playMergeUpgrade();

    const rosterIdx = this.roster.findIndex((r) => r.id === targetId);
    if (rosterIdx >= 0) {
      this.roster[rosterIdx] = target.instance;
    }

    // Remove source from board & roster
    this.removeSummon(sourceId);

    this.events.emit('mergeCompleted', {
      sourceId,
      targetId,
      upgradedTier: next,
      worldPosition: campCellToWorld(target.currentCell),
    });

    this.saveState();
    return true;
  }

  public addSummonToCamp(instance: SummonInstance, targetCell: CampCell): SummonEntity | null {
    let finalCell = targetCell;
    if (isCampCellOccupied(finalCell, this.placements)) {
      const exposed = findFirstExposedCampCell(this.placements);
      if (exposed) {
        finalCell = exposed;
      } else {
        for (let y = 0; y < 6; y++) {
          for (let x = 0; x < 6; x++) {
            if (!isCampCellOccupied({ x, y }, this.placements)) {
              finalCell = { x, y };
              break;
            }
          }
          if (!isCampCellOccupied(finalCell, this.placements)) break;
        }
      }
    }

    if (this.placements.length >= CAMP_CAPACITY || isCampCellOccupied(finalCell, this.placements)) {
      console.warn('Cannot add summon: Camp is full (36/36) or no cell available');
      return null;
    }

    this.roster.push(instance);
    this.placements.push({ summonInstanceId: instance.id, cell: finalCell });
    this.saveState();

    const entity = new SummonEntity(
      this.app,
      this.motion,
      instance,
      finalCell,
      this.worldLayer
    );
    const targetWorldPos = campCellToWorld(finalCell);
    entity.root.setPosition(targetWorldPos[0], targetWorldPos[1], targetWorldPos[2]);
    this.summons.push(entity);
    return entity;
  }

  public spawnAndTransferSummon(
    instance: SummonInstance,
    targetCell: CampCell,
    originPos: [number, number, number],
    onComplete?: (summon: SummonEntity) => void
  ): void {
    // If targetCell is already occupied, find the next available cell
    let finalCell = targetCell;
    if (isCampCellOccupied(finalCell, this.placements)) {
      const exposed = findFirstExposedCampCell(this.placements);
      if (exposed) {
        finalCell = exposed;
      } else {
        for (let y = 0; y < 6; y++) {
          for (let x = 0; x < 6; x++) {
            if (!isCampCellOccupied({ x, y }, this.placements)) {
              finalCell = { x, y };
              break;
            }
          }
          if (!isCampCellOccupied(finalCell, this.placements)) break;
        }
      }
    }

    if (this.placements.length >= CAMP_CAPACITY || isCampCellOccupied(finalCell, this.placements)) {
      console.warn('Cannot spawn summon: Camp is full (36/36) or no cell available');
      return;
    }

    this.roster.push(instance);
    this.placements.push({ summonInstanceId: instance.id, cell: finalCell });
    this.saveState();

    const entity = new SummonEntity(
      this.app,
      this.motion,
      instance,
      finalCell,
      this.worldLayer
    );
    this.summons.push(entity);

    // Initial position at arcade machine drop slot
    entity.root.setPosition(originPos[0], originPos[1], originPos[2]);
    const targetWorldPos = campCellToWorld(finalCell);

    // Arc jump animation to camp cell
    this.motion.tween({
      id: `spawn_jump_${instance.id}`,
      from: 0,
      to: 1,
      duration: DURATION.STANDARD,
      easing: EASING.SNAP,
      onUpdate: (progress) => {
        const x = originPos[0] + (targetWorldPos[0] - originPos[0]) * progress;
        const z = originPos[2] + (targetWorldPos[2] - originPos[2]) * progress;
        const arcY = originPos[1] + (targetWorldPos[1] - originPos[1]) * progress + Math.sin(progress * Math.PI) * 2.5;
        entity.root.setPosition(x, arcY, z);
      },
      onComplete: () => {
        entity.root.setPosition(targetWorldPos[0], targetWorldPos[1], targetWorldPos[2]);
        if (onComplete) onComplete(entity);
      },
    });
  }

  public setBaseVisible(visible: boolean): void {
    this.baseWorld.setVisible(visible);
    this.pachinkoWorld.root.enabled = visible;
    for (const summon of this.summons) {
      summon.root.enabled = visible;
    }
  }

  public update(dt: number): void {
    for (const summon of this.summons) {
      summon.update(dt);
    }
  }

  public destroy(): void {
    for (const summon of this.summons) {
      summon.destroy();
    }
  }
}
