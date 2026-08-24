import type { CampCell, CampPlacement } from '@psyblr/contracts';
import type { SummonEntity } from '../summons/SummonEntity';
import type { CampDropTargetResolver } from './CampDropTargetResolver';
import type { InteractionFeedback } from './InteractionFeedback';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import type { CameraDirector } from '../app/CameraDirector';
import { campCellToWorld, type WorldPoint } from '../world/CampCoordinateMapper';

export class DragController {
  public isDragging: boolean = false;
  public draggedSummon: SummonEntity | null = null;
  public startCell: CampCell | null = null;
  public hoveredTargetCell: CampCell | null = null;

  // Tap vs Drag tracking
  private pointerDownPoint: WorldPoint | null = null;
  private pointerDownTime: number = 0;
  private maxDragDistance: number = 0;
  private hadSummonOnDown: boolean = false;

  // Callbacks
  public onSummonTapped?: (summon: SummonEntity) => void;
  public onGroundTapped?: (groundPoint: WorldPoint) => void;

  constructor(
    private resolver: CampDropTargetResolver,
    private feedback: InteractionFeedback,
    private events: PresentationEventEmitter,
    private cameraDirector?: CameraDirector
  ) {}

  onPointerDown(
    groundPoint: WorldPoint,
    summons: readonly SummonEntity[]
  ): boolean {
    if (this.isDragging) return false;

    this.pointerDownPoint = { ...groundPoint };
    this.pointerDownTime = performance.now();
    this.maxDragDistance = 0;

    // Find if clicked on / near a summon (full cell radius)
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

  onPointerMove(
    groundPoint: WorldPoint,
    placements: readonly CampPlacement[]
  ): void {
    if (this.pointerDownPoint) {
      const dx = groundPoint.x - this.pointerDownPoint.x;
      const dz = groundPoint.z - this.pointerDownPoint.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > this.maxDragDistance) {
        this.maxDragDistance = dist;
      }
    }

    if (!this.isDragging || !this.draggedSummon) return;

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

  onPointerUp(
    onPlacementCommitted?: (summon: SummonEntity, toCell: CampCell, fromCell: CampCell) => void
  ): boolean {
    const elapsed = performance.now() - this.pointerDownTime;
    const isTap = this.maxDragDistance < 0.15 && elapsed < 350;

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
      // Tap on Summon: settle immediately and trigger inspection
      summon.onTapSettle();
      this.onSummonTapped?.(summon);
      return true;
    }

    if (targetCell) {
      // Valid placement committed
      summon.onLanding(targetCell);

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

      if (onPlacementCommitted) {
        onPlacementCommitted(summon, targetCell, startCell);
      }
      return true;
    } else {
      // Invalid drop — elastic spring return
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

  cancel(): void {
    if (!this.isDragging || !this.draggedSummon || !this.startCell) {
      return;
    }

    const summon = this.draggedSummon;
    const startCell = this.startCell;

    this.feedback.hide();
    this.isDragging = false;
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
  }

  update(dt: number): void {
    this.feedback.update(dt);
  }
}
