import { describe, it, expect } from 'vitest';
import { CampDropTargetResolver } from './CampDropTargetResolver';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import type { CampPlacement } from '@psyblr/contracts';

describe('CampDropTargetResolver', () => {
  const resolver = new CampDropTargetResolver();
  const summonId = 'starter:goku:001';
  const emptyPlacements: CampPlacement[] = [];

  it('resolves exact cell centers correctly', () => {
    const worldPos = campCellToWorld({ x: 2, y: 3 });
    const target = resolver.resolveDropTarget(
      { x: worldPos[0], z: worldPos[2] },
      summonId,
      emptyPlacements
    );

    expect(target).toEqual({ x: 2, y: 3 });
  });

  it('magnetically snaps slightly off-center points to the closest cell', () => {
    const worldPos = campCellToWorld({ x: 1, y: 4 });
    // Offset by 0.3 units (within 1.25 cell)
    const target = resolver.resolveDropTarget(
      { x: worldPos[0] + 0.3, z: worldPos[2] - 0.2 },
      summonId,
      emptyPlacements
    );

    expect(target).toEqual({ x: 1, y: 4 });
  });

  it('magnetically snaps points just outside the boundary within padding tolerance', () => {
    const worldPos = campCellToWorld({ x: 0, y: 0 });
    // Point 0.2 units outside the northwest corner
    const target = resolver.resolveDropTarget(
      { x: worldPos[0] - 0.2, z: worldPos[2] - 0.2 },
      summonId,
      emptyPlacements,
      0.5 // padding
    );

    expect(target).toEqual({ x: 0, y: 0 });
  });

  it('rejects points far outside the magnetic tolerance area', () => {
    const target = resolver.resolveDropTarget(
      { x: 15, z: 15 },
      summonId,
      emptyPlacements,
      0.5
    );

    expect(target).toBeNull();
  });

  it('resolves occupied cells as valid targets for position swapping', () => {
    const occupiedCell = { x: 3, y: 3 };
    const placements: CampPlacement[] = [
      { summonInstanceId: 'starter:naruto:002', cell: occupiedCell },
    ];

    const worldPos = campCellToWorld(occupiedCell);
    const target = resolver.resolveDropTarget(
      { x: worldPos[0], z: worldPos[2] },
      summonId,
      placements
    );

    expect(target).toEqual(occupiedCell);
  });

  it('permits dropping onto the cell currently occupied by the dragged summon itself', () => {
    const currentCell = { x: 2, y: 3 };
    const placements: CampPlacement[] = [
      { summonInstanceId: summonId, cell: currentCell },
    ];

    const worldPos = campCellToWorld(currentCell);
    const target = resolver.resolveDropTarget(
      { x: worldPos[0], z: worldPos[2] },
      summonId,
      placements
    );

    expect(target).toEqual(currentCell);
  });

  describe('resolveTacticalDropTarget', () => {
    const units = [
      { summonId: 'goku_1', cell: { x: 2, z: 5 } },
      { summonId: 'luffy_1', cell: { x: 4, z: 6 } },
    ];

    it('resolves valid player territory placement in Campaign mode', () => {
      // Campaign origin is [0, 0, -40]. Cell (3, 5): worldX = 3 - 3.5 = -0.5, worldZ = -40 + (5 - 3.5) = -38.5
      const res = resolver.resolveTacticalDropTarget(
        { x: -0.5, z: -38.5 },
        'campaign',
        units,
        'naruto_1'
      );

      expect(res).not.toBeNull();
      expect(res?.isValidPlayerZone).toBe(true);
      expect(res?.cell).toEqual({ x: 3, z: 5 });
      expect(res?.isSwap).toBe(false);
      expect(res?.isRecall).toBe(false);
    });

    it('detects unit swap when hovering over another occupied unit cell', () => {
      // Cell (2, 5): worldX = 2 - 3.5 = -1.5, worldZ = -40 + (5 - 3.5) = -38.5
      const res = resolver.resolveTacticalDropTarget(
        { x: -1.5, z: -38.5 },
        'campaign',
        units,
        'naruto_1'
      );

      expect(res).not.toBeNull();
      expect(res?.isValidPlayerZone).toBe(true);
      expect(res?.cell).toEqual({ x: 2, z: 5 });
      expect(res?.isSwap).toBe(true);
      expect(res?.occupantId).toBe('goku_1');
    });

    it('rejects enemy territory placements (z < 4)', () => {
      // Cell (2, 2): worldX = 2 - 3.5 = -1.5, worldZ = -40 + (2 - 3.5) = -41.5
      const res = resolver.resolveTacticalDropTarget(
        { x: -1.5, z: -41.5 },
        'campaign',
        units,
        'naruto_1'
      );

      expect(res).not.toBeNull();
      expect(res?.isValidPlayerZone).toBe(false);
      expect(res?.isSwap).toBe(false);
    });

    it('detects bench recall when dragging towards bottom of the screen (localZ > 4.6)', () => {
      // Dragged down into tray area: worldZ = -40 + 5.0 = -35.0
      const res = resolver.resolveTacticalDropTarget(
        { x: 0, z: -35.0 },
        'campaign',
        units,
        'goku_1'
      );

      expect(res).not.toBeNull();
      expect(res?.isRecall).toBe(true);
    });

    it('resolves valid player territory placement in Raid mode', () => {
      // Raid origin is [-40, 0, 0]. Cell (3, 5): worldX = -40 + (3 - 3.5) = -40.5, worldZ = 5 - 3.5 = 1.5
      const res = resolver.resolveTacticalDropTarget(
        { x: -40.5, z: 1.5 },
        'raid',
        units,
        'naruto_1'
      );

      expect(res).not.toBeNull();
      expect(res?.isValidPlayerZone).toBe(true);
      expect(res?.cell).toEqual({ x: 3, z: 5 });
      expect(res?.isSwap).toBe(false);
    });
  });
});
