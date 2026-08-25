import type { CampCell, CampPlacement, SummonInstance } from '@psyblr/contracts';
import type { SummonEntity } from '../summons/SummonEntity';
import type { CampDropTargetResolver, TacticalDropResult } from './CampDropTargetResolver';
import type { InteractionFeedback } from './InteractionFeedback';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import type { CameraDirector } from '../app/CameraDirector';
import { campCellToWorld, CAMP_CELL_SIZE, type WorldPoint } from '../world/CampCoordinateMapper';
import { CAMP_SIZE } from '@psyblr/game-rules';
import { OPPONENT_CAMP_ORIGIN, type OpponentSummonEntry } from '../world/OpponentCampWorld';
import type { Entity } from 'playcanvas';

export interface TacticalUnit {
  summonId: string;
  definitionId: string;
  tier: string;
  cell: { x: number; z: number };
  worldPos: [number, number, number];
  entity?: Entity | undefined;
}

export type TacticalMoveCallback = (
  summonId: string,
  toCell: { x: number; z: number },
  fromCell: { x: number; z: number }
) => void;
export type TacticalSwapCallback = (summonId1: string, summonId2: string) => void;
export type TacticalRecallCallback = (summonId: string) => void;
export type TacticalDeployCallback = (summon: SummonInstance, cell: { x: number; z: number }) => void;

export class DragController {
  public mode: 'base' | 'campaign' | 'raid' | 'opponentCamp' = 'base';
  public isDragging: boolean = false;
  public isCombatActive: boolean = false;

  // Base Camp Drag state
  public draggedSummon: SummonEntity | null = null;
  public startCell: CampCell | null = null;
  public hoveredTargetCell: CampCell | null = null;

  // Tactical Drag state (Campaign / Raid)
  public tacticalUnits: TacticalUnit[] = [];
  public tacticalDraggedUnit: TacticalUnit | null = null;
  public tacticalStartCell: { x: number; z: number } | null = null;
  public tacticalHoveredTarget: TacticalDropResult | null = null;
  public cardDraggedSummon: SummonInstance | null = null;

  // Opponent Camp Steal state
  public opponentSummons: readonly OpponentSummonEntry[] = [];
  private opponentTappedSummon: OpponentSummonEntry | null = null;

  // Tap vs Drag threshold detection
  private pointerDownPoint: WorldPoint | null = null;
  private pointerDownTime: number = 0;
  private maxDragDistance: number = 0;
  private hadSummonOnDown: boolean = false;
  private readonly tapThresholdDistance: number = 0.35;
  private readonly tapThresholdDurationMs: number = 300;

  public onSummonTapped?: (summon: SummonEntity) => void;
  public onGroundTapped?: (point: WorldPoint) => void;
  public onOpponentSummonTapped?: (entry: OpponentSummonEntry) => void;

  public onTacticalMove?: TacticalMoveCallback;
  public onTacticalSwap?: TacticalSwapCallback;
  public onTacticalRecall?: TacticalRecallCallback;
  public onTacticalDeploy?: TacticalDeployCallback;

  constructor(
    private resolver: CampDropTargetResolver,
    private feedback: InteractionFeedback,
    private events: PresentationEventEmitter,
    private cameraDirector?: CameraDirector
  ) {}

  setCombatActive(active: boolean): void {
    if (active && this.isDragging) {
      this.cancel();
    }
    this.isCombatActive = active;
  }

  setMode(mode: 'base' | 'campaign' | 'raid' | 'opponentCamp'): void {
    if (this.isDragging) {
      this.cancel();
    }
    this.isCombatActive = false;
    this.mode = mode;
  }

  setTacticalUnits(units: readonly TacticalUnit[]): void {
    this.tacticalUnits = [...units];
  }

  setOpponentSummons(summons: readonly OpponentSummonEntry[]): void {
    this.opponentSummons = [...summons];
  }

  startCardDrag(summon: SummonInstance, groundPoint?: WorldPoint | null): void {
    if (this.isCombatActive) return;
    if (this.isDragging) {
      this.cancel();
    }
    this.isDragging = true;
    this.cardDraggedSummon = summon;
    this.tacticalDraggedUnit = null;
    this.tacticalStartCell = null;
    this.pointerDownTime = performance.now();
    this.maxDragDistance = 1.0;

    if (groundPoint) {
      this.pointerDownPoint = { ...groundPoint };
      this.onPointerMove(groundPoint, []);
    }
  }

  onPointerDown(
    groundPoint: WorldPoint,
    summons: readonly SummonEntity[] = []
  ): boolean {
    if (this.isCombatActive || this.isDragging) return false;

    this.pointerDownPoint = { ...groundPoint };
    this.pointerDownTime = performance.now();
    this.maxDragDistance = 0;

    if (this.mode === 'campaign' || this.mode === 'raid') {
      return this.onTacticalPointerDown(groundPoint);
    }

    if (this.mode === 'opponentCamp') {
      const pickRadius = 1.25;
      let closest: OpponentSummonEntry | null = null;
      let closestDist = pickRadius;

      for (const entry of this.opponentSummons) {
        const halfSpan = (CAMP_SIZE - 1) / 2;
        const lx = (entry.cell.x - halfSpan) * CAMP_CELL_SIZE;
        const lz = (entry.cell.y - halfSpan) * CAMP_CELL_SIZE;
        const worldX = OPPONENT_CAMP_ORIGIN[0] + lx;
        const worldZ = OPPONENT_CAMP_ORIGIN[2] + lz;
        const dx = groundPoint.x - worldX;
        const dz = groundPoint.z - worldZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < closestDist) {
          closestDist = dist;
          closest = entry;
        }
      }

      this.opponentTappedSummon = closest;
      this.hadSummonOnDown = !!closest;
      return !!closest;
    }

    // Base Camp mode
    const pickRadius = 1.25;
    let closestSummon: SummonEntity | null = null;
    let closestDist = pickRadius;

    for (const summon of summons) {
      if (summon.state !== 'IDLE') continue;
      const worldPos = campCellToWorld(summon.currentCell);
      const dx = groundPoint.x - worldPos[0];
      const dz = groundPoint.z - worldPos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < closestDist) {
        closestDist = dist;
        closestSummon = summon;
      }
    }

    if (!closestSummon) {
      this.hadSummonOnDown = false;
      return false;
    }

    this.hadSummonOnDown = true;
    this.isDragging = true;
    this.draggedSummon = closestSummon;
    this.startCell = { ...closestSummon.currentCell };
    this.hoveredTargetCell = { ...closestSummon.currentCell };

    closestSummon.onGrabbed();
    this.feedback.showTarget(this.startCell);

    const worldPos = campCellToWorld(this.startCell);
    this.events.emit('summonGrabbed', {
      summonId: closestSummon.instance.id,
      startCell: this.startCell,
      worldPosition: worldPos,
    });

    return true;
  }

  private onTacticalPointerDown(groundPoint: WorldPoint): boolean {
    const pickRadius = 1.1;
    let closestUnit: TacticalUnit | null = null;
    let closestDist = pickRadius;

    for (const unit of this.tacticalUnits) {
      const dx = groundPoint.x - unit.worldPos[0];
      const dz = groundPoint.z - unit.worldPos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < closestDist) {
        closestDist = dist;
        closestUnit = unit;
      }
    }

    if (!closestUnit) {
      this.hadSummonOnDown = false;
      return false;
    }

    this.hadSummonOnDown = true;
    this.isDragging = true;
    this.tacticalDraggedUnit = closestUnit;
    this.tacticalStartCell = { ...closestUnit.cell };

    if (closestUnit.entity) {
      const curPos = closestUnit.entity.getPosition();
      closestUnit.entity.setPosition(curPos.x, curPos.y + 0.35, curPos.z);
    }

    this.feedback.showTacticalTarget(closestUnit.worldPos, 'valid');

    this.events.emit('summonGrabbed', {
      summonId: closestUnit.summonId,
      startCell: { x: closestUnit.cell.x, y: closestUnit.cell.z },
      worldPosition: closestUnit.worldPos,
    });

    return true;
  }

  onPointerMove(
    groundPoint: WorldPoint,
    placements: readonly CampPlacement[] = []
  ): void {
    if (this.isCombatActive) return;

    if (this.pointerDownPoint) {
      const dx = groundPoint.x - this.pointerDownPoint.x;
      const dz = groundPoint.z - this.pointerDownPoint.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > this.maxDragDistance) {
        this.maxDragDistance = dist;
      }
    }

    if (!this.isDragging) return;

    if (this.mode === 'campaign' || this.mode === 'raid') {
      this.onTacticalPointerMove(groundPoint);
      return;
    }

    // Base Camp mode
    if (!this.draggedSummon) return;
    this.draggedSummon.setDragWorldPosition(groundPoint.x, groundPoint.z);

    const candidateTarget = this.resolver.resolveDropTarget(
      groundPoint,
      this.draggedSummon.instance.id,
      placements
    );

    const prevCell = this.hoveredTargetCell;
    const isDifferent =
      (!prevCell && candidateTarget) ||
      (prevCell && !candidateTarget) ||
      (prevCell && candidateTarget && (prevCell.x !== candidateTarget.x || prevCell.y !== candidateTarget.y));

    if (isDifferent) {
      this.hoveredTargetCell = candidateTarget;

      if (candidateTarget) {
        this.feedback.showTarget(candidateTarget);
      } else {
        this.feedback.hide();
      }

      this.events.emit('dragTargetChanged', {
        summonId: this.draggedSummon.instance.id,
        previousCell: prevCell,
        currentCell: candidateTarget,
        worldPosition: candidateTarget ? campCellToWorld(candidateTarget) : null,
      });
    }
  }

  private onTacticalPointerMove(groundPoint: WorldPoint): void {
    const draggedId = this.tacticalDraggedUnit?.summonId ?? this.cardDraggedSummon?.id;

    if (this.tacticalDraggedUnit?.entity) {
      this.tacticalDraggedUnit.entity.setPosition(groundPoint.x, 0.4, groundPoint.z);
    }

    const currentPlacements = this.tacticalUnits.map((u) => ({
      summonId: u.summonId,
      cell: u.cell,
    }));

    const result = this.resolver.resolveTacticalDropTarget(
      groundPoint,
      this.mode as 'campaign' | 'raid',
      currentPlacements,
      draggedId
    );

    this.tacticalHoveredTarget = result;

    if (!result) {
      this.feedback.hide();
      return;
    }

    if (result.isRecall) {
      this.feedback.hide();
    } else if (result.isValidPlayerZone) {
      this.feedback.showTacticalTarget(
        result.worldPos,
        result.isSwap ? 'swap' : 'valid'
      );
    } else {
      this.feedback.showTacticalTarget(result.worldPos, 'invalid');
    }
  }

  onPointerUp(
    onPlacementCommitted?: (summon: SummonEntity, toCell: CampCell, fromCell: CampCell) => void
  ): boolean {
    if (this.isCombatActive) {
      if (this.isDragging) this.cancel();
      return false;
    }

    const elapsed = performance.now() - this.pointerDownTime;
    const isTap = this.maxDragDistance < 0.15 && elapsed < 350;

    if (this.mode === 'campaign' || this.mode === 'raid') {
      return this.onTacticalPointerUp(isTap);
    }

    if (this.mode === 'opponentCamp') {
      const tapped = this.opponentTappedSummon;
      this.opponentTappedSummon = null;
      this.pointerDownPoint = null;

      if (isTap && tapped) {
        this.onOpponentSummonTapped?.(tapped);
        return true;
      }
      return false;
    }

    // Base Camp mode
    if (!this.isDragging || !this.draggedSummon || !this.startCell) {
      if (!this.hadSummonOnDown && this.pointerDownPoint && isTap) {
        this.onGroundTapped?.(this.pointerDownPoint);
      }
      this.pointerDownPoint = null;
      return false;
    }

    const summon = this.draggedSummon;
    const startCell = this.startCell;
    const targetCell = this.hoveredTargetCell;

    this.feedback.hide();
    this.isDragging = false;
    this.draggedSummon = null;
    this.startCell = null;
    this.hoveredTargetCell = null;
    this.pointerDownPoint = null;

    if (isTap) {
      summon.onTapSettle();
      this.onSummonTapped?.(summon);
      return true;
    }

    if (targetCell) {
      if (this.cameraDirector) {
        this.cameraDirector.triggerDropImpulse();
      }

      const worldPos = campCellToWorld(targetCell);
      this.events.emit('summonPlaced', {
        summonId: summon.instance.id,
        fromCell: startCell,
        toCell: targetCell,
        worldPosition: worldPos,
      });

      summon.onLanding(targetCell);
      if (onPlacementCommitted) {
        onPlacementCommitted(summon, targetCell, startCell);
      }
      return true;
    } else {
      summon.onReturnToOrigin();

      const worldPos = campCellToWorld(startCell);
      this.events.emit('summonReturned', {
        summonId: summon.instance.id,
        targetCell: startCell,
        worldPosition: worldPos,
      });

      return false;
    }
  }

  private onTacticalPointerUp(isTap: boolean): boolean {
    const target = this.tacticalHoveredTarget;
    const draggedBoardUnit = this.tacticalDraggedUnit;
    const startCell = this.tacticalStartCell;
    const cardSummon = this.cardDraggedSummon;

    this.feedback.hide();
    this.isDragging = false;
    this.tacticalDraggedUnit = null;
    this.tacticalStartCell = null;
    this.tacticalHoveredTarget = null;
    this.cardDraggedSummon = null;
    this.pointerDownPoint = null;

    // 1. Dragging from UI tray card onto board
    if (cardSummon) {
      if (target && target.isValidPlayerZone && !target.isRecall) {
        this.onTacticalDeploy?.(cardSummon, target.cell);
        if (this.cameraDirector) this.cameraDirector.triggerDropImpulse(0.06);
        return true;
      }
      return false;
    }

    if (!draggedBoardUnit || !startCell) {
      return false;
    }

    // 2. Tapped on board unit
    if (isTap) {
      if (draggedBoardUnit.entity) {
        const originPos = draggedBoardUnit.worldPos;
        draggedBoardUnit.entity.setPosition(originPos[0], originPos[1], originPos[2]);
      }
      return true;
    }

    // 3. Dragged unit dropped
    if (target) {
      if (target.isRecall) {
        // Recalled to bench
        this.onTacticalRecall?.(draggedBoardUnit.summonId);
        return true;
      }

      if (target.isValidPlayerZone) {
        if (target.isSwap && target.occupantId) {
          // Swap positions
          this.onTacticalSwap?.(draggedBoardUnit.summonId, target.occupantId);
          if (this.cameraDirector) this.cameraDirector.triggerDropImpulse(0.07);
          return true;
        } else {
          // Move to empty cell
          this.onTacticalMove?.(draggedBoardUnit.summonId, target.cell, startCell);
          if (this.cameraDirector) this.cameraDirector.triggerDropImpulse(0.07);
          return true;
        }
      }
    }

    // Invalid drop -> return to origin
    if (draggedBoardUnit.entity) {
      const originPos = draggedBoardUnit.worldPos;
      draggedBoardUnit.entity.setPosition(originPos[0], originPos[1], originPos[2]);
    }
    return false;
  }

  cancel(): void {
    this.feedback.hide();
    this.isDragging = false;
    this.opponentTappedSummon = null;

    if (this.draggedSummon && this.startCell) {
      const summon = this.draggedSummon;
      const startCell = this.startCell;
      this.draggedSummon = null;
      this.startCell = null;
      this.hoveredTargetCell = null;
      this.pointerDownPoint = null;

      summon.onReturnToOrigin();
      const worldPos = campCellToWorld(startCell);
      this.events.emit('summonReturned', {
        summonId: summon.instance.id,
        targetCell: startCell,
        worldPosition: worldPos,
      });
      return;
    }

    if (this.tacticalDraggedUnit) {
      const unit = this.tacticalDraggedUnit;
      this.tacticalDraggedUnit = null;
      this.tacticalStartCell = null;
      this.tacticalHoveredTarget = null;
      this.cardDraggedSummon = null;
      this.pointerDownPoint = null;

      if (unit.entity) {
        const originPos = unit.worldPos;
        unit.entity.setPosition(originPos[0], originPos[1], originPos[2]);
      }
    }
  }

  update(dt: number): void {
    this.feedback.update(dt);
  }
}
