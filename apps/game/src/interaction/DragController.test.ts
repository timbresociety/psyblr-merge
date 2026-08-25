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
      showTacticalTarget: vi.fn(),
      hideTacticalTarget: vi.fn(),
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
    expect(commitCallback).toHaveBeenCalledWith(summon, targetCell, { x: 2, y: 3 });
    expect(feedback.hide).toHaveBeenCalled();
    expect(placedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fromCell: { x: 2, y: 3 },
        toCell: { x: 1, y: 1 },
      })
    );
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

  describe('Tactical Mode (Campaign & Raid)', () => {
    it('handles tactical unit move to legal cell', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('campaign');
      const unit1 = {
        summonId: 'goku_1',
        definitionId: 'goku',
        tier: 'F',
        cell: { x: 2, z: 5 },
        worldPos: [ -1.5, 0.05, -38.5 ] as [number, number, number],
      };
      controller.setTacticalUnits([unit1]);

      const onMoveSpy = vi.fn();
      controller.onTacticalMove = onMoveSpy;

      // Pointer down near unit1
      const hit = controller.onPointerDown({ x: -1.5, z: -38.5 });
      expect(hit).toBe(true);
      expect(controller.isDragging).toBe(true);

      // Drag to cell (3, 6): worldX = 3 - 3.5 = -0.5, worldZ = -40 + (6 - 3.5) = -37.5
      controller.onPointerMove({ x: -0.5, z: -37.5 }, []);

      // Pointer up commits move
      controller.onPointerUp();
      expect(onMoveSpy).toHaveBeenCalledWith('goku_1', { x: 3, z: 6 }, { x: 2, z: 5 });
    });

    it('handles tactical unit swap when dropped onto another unit', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('campaign');
      const unit1 = {
        summonId: 'goku_1',
        definitionId: 'goku',
        tier: 'F',
        cell: { x: 2, z: 5 },
        worldPos: [ -1.5, 0.05, -38.5 ] as [number, number, number],
      };
      const unit2 = {
        summonId: 'luffy_1',
        definitionId: 'luffy',
        tier: 'F',
        cell: { x: 4, z: 6 },
        worldPos: [ 0.5, 0.05, -37.5 ] as [number, number, number],
      };
      controller.setTacticalUnits([unit1, unit2]);

      const onSwapSpy = vi.fn();
      controller.onTacticalSwap = onSwapSpy;

      // Grab unit1
      controller.onPointerDown({ x: -1.5, z: -38.5 }, []);

      // Move over unit2's cell (4, 6)
      controller.onPointerMove({ x: 0.5, z: -37.5 }, []);

      // Drop on unit2
      controller.onPointerUp();
      expect(onSwapSpy).toHaveBeenCalledWith('goku_1', 'luffy_1');
    });

    it('handles tactical unit bench recall when dragged towards tray', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('campaign');
      const unit1 = {
        summonId: 'goku_1',
        definitionId: 'goku',
        tier: 'F',
        cell: { x: 2, z: 5 },
        worldPos: [ -1.5, 0.05, -38.5 ] as [number, number, number],
      };
      controller.setTacticalUnits([unit1]);

      const onRecallSpy = vi.fn();
      controller.onTacticalRecall = onRecallSpy;

      // Grab unit1
      controller.onPointerDown({ x: -1.5, z: -38.5 }, []);

      // Drag towards tray (worldZ = -35.0)
      controller.onPointerMove({ x: 0, z: -35.0 }, []);

      // Drop
      controller.onPointerUp();
      expect(onRecallSpy).toHaveBeenCalledWith('goku_1');
    });

    it('handles card drag from tray and deploys onto valid tactical cell', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('campaign');
      controller.setTacticalUnits([]);

      const onDeploySpy = vi.fn();
      controller.onTacticalDeploy = onDeploySpy;

      const summon: SummonInstance = { id: 'starter:goku:001', definitionId: 'goku', tier: 'F' };

      // Start drag from UI card
      controller.startCardDrag(summon);
      expect(controller.isDragging).toBe(true);
      expect(controller.cardDraggedSummon).toBe(summon);

      // Move over player tactical cell (x: 3, z: 5) -> localX = 3 - 3.5 = -0.5, localZ = 5 - 3.5 = 1.5 -> worldZ = -40 + 1.5 = -38.5
      controller.onPointerMove({ x: -0.5, z: -38.5 }, []);
      expect(controller.tacticalHoveredTarget?.cell).toEqual({ x: 3, z: 5 });
      expect(controller.tacticalHoveredTarget?.isValidPlayerZone).toBe(true);

      // Drop onto cell
      const committed = controller.onPointerUp();
      expect(committed).toBe(true);
      expect(onDeploySpy).toHaveBeenCalledWith(summon, { x: 3, z: 5 });
    });

    it('rejects card drag drop on invalid zone (enemy half)', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('campaign');
      controller.setTacticalUnits([]);

      const onDeploySpy = vi.fn();
      controller.onTacticalDeploy = onDeploySpy;

      const summon: SummonInstance = { id: 'starter:goku:001', definitionId: 'goku', tier: 'F' };

      controller.startCardDrag(summon);

      // Move over enemy zone (z: 1 < 4) -> worldZ = -40 + (1 - 3.5) = -42.5
      controller.onPointerMove({ x: 0, z: -42.5 }, []);
      expect(controller.tacticalHoveredTarget?.isValidPlayerZone).toBe(false);

      const committed = controller.onPointerUp();
      expect(committed).toBe(false);
      expect(onDeploySpy).not.toHaveBeenCalled();
    });
  });

  describe('Opponent Camp Mode', () => {
    it('detects tap on exposed opponent summon and fires onOpponentSummonTapped', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('opponentCamp');

      const mockOpponent: any = {
        instance: { id: 'opp:naruto:03', definitionId: 'naruto', tier: 'E' },
        cell: { x: 1, y: 2 },
        isProtected: false,
      };

      controller.setOpponentSummons([mockOpponent]);

      const onTappedSpy = vi.fn();
      controller.onOpponentSummonTapped = onTappedSpy;

      // cell (1, 2): worldX = 40 + (1 - 2.5) * 1.0 = 38.5, worldZ = 0 + (2 - 2.5) * 1.0 = -0.5
      const hit = controller.onPointerDown({ x: 38.5, z: -0.5 }, []);
      expect(hit).toBe(true);

      const handled = controller.onPointerUp();
      expect(handled).toBe(true);
      expect(onTappedSpy).toHaveBeenCalledWith(mockOpponent);
    });

    it('detects tap on protected opponent summon (Row 0 Illuminati)', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('opponentCamp');

      const mockProtectedOpponent: any = {
        instance: { id: 'opp:goku:01', definitionId: 'goku', tier: 'D' },
        cell: { x: 2, y: 0 },
        isProtected: true,
      };

      controller.setOpponentSummons([mockProtectedOpponent]);

      const onTappedSpy = vi.fn();
      controller.onOpponentSummonTapped = onTappedSpy;

      // cell (2, 0): worldX = 40 + (2 - 2.5) * 1.0 = 39.5, worldZ = 0 + (0 - 2.5) * 1.0 = -2.5
      const hit = controller.onPointerDown({ x: 39.5, z: -2.5 }, []);
      expect(hit).toBe(true);

      const handled = controller.onPointerUp();
      expect(handled).toBe(true);
      expect(onTappedSpy).toHaveBeenCalledWith(mockProtectedOpponent);
    });
  });

  describe('Combat Lock (isCombatActive)', () => {
    it('cancels active drag when setCombatActive(true) is invoked', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('campaign');
      const unit1 = {
        summonId: 'goku_1',
        definitionId: 'goku',
        tier: 'F',
        cell: { x: 2, z: 5 },
        worldPos: [-1.5, 0.05, -38.5] as [number, number, number],
      };
      controller.setTacticalUnits([unit1]);

      const hit = controller.onPointerDown({ x: -1.5, z: -38.5 });
      expect(hit).toBe(true);
      expect(controller.isDragging).toBe(true);

      // Battle begins mid-drag
      controller.setCombatActive(true);
      expect(controller.isDragging).toBe(false);
      expect(controller.isCombatActive).toBe(true);
      expect(feedback.hide).toHaveBeenCalled();
    });

    it('rejects onPointerDown on board units when combat is active', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('campaign');
      const unit1 = {
        summonId: 'goku_1',
        definitionId: 'goku',
        tier: 'F',
        cell: { x: 2, z: 5 },
        worldPos: [-1.5, 0.05, -38.5] as [number, number, number],
      };
      controller.setTacticalUnits([unit1]);
      controller.setCombatActive(true);

      const hit = controller.onPointerDown({ x: -1.5, z: -38.5 });
      expect(hit).toBe(false);
      expect(controller.isDragging).toBe(false);
    });

    it('rejects startCardDrag from bottom tray when combat is active', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('campaign');
      controller.setCombatActive(true);

      const summon: SummonInstance = { id: 'starter:goku:001', definitionId: 'goku', tier: 'F' };
      controller.startCardDrag(summon);

      expect(controller.isDragging).toBe(false);
      expect(controller.cardDraggedSummon).toBeNull();
    });

    it('prevents any tactical callbacks when combat is active', () => {
      const resolver = new CampDropTargetResolver();
      const feedback = createMockFeedback();
      const events = new PresentationEventEmitter();
      const controller = new DragController(resolver, feedback, events);

      controller.setMode('campaign');
      const unit1 = {
        summonId: 'goku_1',
        definitionId: 'goku',
        tier: 'F',
        cell: { x: 2, z: 5 },
        worldPos: [-1.5, 0.05, -38.5] as [number, number, number],
      };
      controller.setTacticalUnits([unit1]);

      const onMoveSpy = vi.fn();
      const onSwapSpy = vi.fn();
      const onRecallSpy = vi.fn();
      const onDeploySpy = vi.fn();
      controller.onTacticalMove = onMoveSpy;
      controller.onTacticalSwap = onSwapSpy;
      controller.onTacticalRecall = onRecallSpy;
      controller.onTacticalDeploy = onDeploySpy;

      controller.setCombatActive(true);

      controller.onPointerMove({ x: -0.5, z: -37.5 }, []);
      const handled = controller.onPointerUp();

      expect(handled).toBe(false);
      expect(onMoveSpy).not.toHaveBeenCalled();
      expect(onSwapSpy).not.toHaveBeenCalled();
      expect(onRecallSpy).not.toHaveBeenCalled();
      expect(onDeploySpy).not.toHaveBeenCalled();
    });
  });
});

