import { describe, it, expect, vi } from 'vitest';
import { DragController } from './DragController';
import { CampDropTargetResolver } from './CampDropTargetResolver';
import { PresentationEventEmitter } from '../presentation/PresentationEvents';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import type { CampCell, CampPlacement, SummonInstance } from '@psyblr/contracts';
import type { SummonEntity } from '../summons/SummonEntity';

describe('DragController', () => {
  function createMockSummon(cell: CampCell, id: string = 'starter:goku:001'): SummonEntity {
    return {
      instance: { id, definitionId: 'goku', tier: 'F' } as SummonInstance,
      currentCell: { ...cell },
      state: 'IDLE',
      onGrabbed: vi.fn(function (this: any) {
        this.state = 'GRABBED';
      }),
      setDragWorldPosition: vi.fn(function (this: any) {
        this.state = 'DRAGGING';
      }),
      onLanding: vi.fn(function (this: any, toCell: CampCell) {
        this.currentCell = { ...toCell };
        this.state = 'IDLE';
      }),
      onReturnToOrigin: vi.fn(function (this: any) {
        this.state = 'IDLE';
      }),
    } as unknown as SummonEntity;
  }

  function createMockFeedback() {
    return {
      showTarget: vi.fn(),
      hide: vi.fn(),
      update: vi.fn(),
    } as any;
  }

  it('initiates drag when pointer hits a summon entity', () => {
    const resolver = new CampDropTargetResolver();
    const feedback = createMockFeedback();
    const events = new PresentationEventEmitter();
    const controller = new DragController(resolver, feedback, events);

    const summon = createMockSummon({ x: 2, y: 3 });
    const worldPos = campCellToWorld({ x: 2, y: 3 });

    const grabbedSpy = vi.fn();
    events.on('summonGrabbed', grabbedSpy);

    const hit = controller.onPointerDown({ x: worldPos[0], z: worldPos[2] }, [summon]);

    expect(hit).toBe(true);
    expect(controller.isDragging).toBe(true);
    expect(controller.draggedSummon).toBe(summon);
    expect(summon.onGrabbed).toHaveBeenCalled();
    expect(feedback.showTarget).toHaveBeenCalledWith({ x: 2, y: 3 });
    expect(grabbedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        summonId: 'starter:goku:001',
        startCell: { x: 2, y: 3 },
      })
    );
  });

  it('updates magnetic hover target and emits dragTargetChanged on pointer move', () => {
    const resolver = new CampDropTargetResolver();
    const feedback = createMockFeedback();
    const events = new PresentationEventEmitter();
    const controller = new DragController(resolver, feedback, events);

    const summon = createMockSummon({ x: 2, y: 3 });
    const startWorld = campCellToWorld({ x: 2, y: 3 });

    controller.onPointerDown({ x: startWorld[0], z: startWorld[2] }, [summon]);

    const targetChangeSpy = vi.fn();
    events.on('dragTargetChanged', targetChangeSpy);

    // Move to cell (4, 4)
    const newWorld = campCellToWorld({ x: 4, y: 4 });
    controller.onPointerMove({ x: newWorld[0], z: newWorld[2] }, []);

    expect(controller.hoveredTargetCell).toEqual({ x: 4, y: 4 });
    expect(feedback.showTarget).toHaveBeenCalledWith({ x: 4, y: 4 });
    expect(targetChangeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        previousCell: { x: 2, y: 3 },
        currentCell: { x: 4, y: 4 },
      })
    );
  });

  it('commits landing on pointer up over a valid cell', () => {
    const resolver = new CampDropTargetResolver();
    const feedback = createMockFeedback();
    const events = new PresentationEventEmitter();
    const controller = new DragController(resolver, feedback, events);

    const summon = createMockSummon({ x: 2, y: 3 });
    const startWorld = campCellToWorld({ x: 2, y: 3 });

    controller.onPointerDown({ x: startWorld[0], z: startWorld[2] }, [summon]);

    // Move to cell (1, 1)
    const targetCell = { x: 1, y: 1 };
    const targetWorld = campCellToWorld(targetCell);
    controller.onPointerMove({ x: targetWorld[0], z: targetWorld[2] }, []);

    const placedSpy = vi.fn();
    events.on('summonPlaced', placedSpy);

    const commitCallback = vi.fn();
    const success = controller.onPointerUp(commitCallback);

    expect(success).toBe(true);
    expect(controller.isDragging).toBe(false);
    expect(summon.onLanding).toHaveBeenCalledWith(targetCell);
    expect(feedback.hide).toHaveBeenCalled();
    expect(placedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fromCell: { x: 2, y: 3 },
        toCell: { x: 1, y: 1 },
      })
    );
    expect(commitCallback).toHaveBeenCalledWith(summon, targetCell, { x: 2, y: 3 });
  });

  it('triggers return to origin on pointer up over an invalid area', () => {
    const resolver = new CampDropTargetResolver();
    const feedback = createMockFeedback();
    const events = new PresentationEventEmitter();
    const controller = new DragController(resolver, feedback, events);

    const summon = createMockSummon({ x: 2, y: 3 });
    const startWorld = campCellToWorld({ x: 2, y: 3 });

    controller.onPointerDown({ x: startWorld[0], z: startWorld[2] }, [summon]);

    // Move far outside camp
    controller.onPointerMove({ x: 20, z: 20 }, []);

    const returnedSpy = vi.fn();
    events.on('summonReturned', returnedSpy);

    const success = controller.onPointerUp();

    expect(success).toBe(false);
    expect(controller.isDragging).toBe(false);
    expect(summon.onReturnToOrigin).toHaveBeenCalled();
    expect(returnedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        targetCell: { x: 2, y: 3 },
      })
    );
  });
});
