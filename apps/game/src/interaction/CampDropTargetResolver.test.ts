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

  it('rejects cells occupied by another summon', () => {
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

    expect(target).toBeNull();
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
});
