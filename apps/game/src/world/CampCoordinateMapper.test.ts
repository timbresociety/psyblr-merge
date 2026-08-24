import { describe, it, expect } from 'vitest';
import {
  campCellToWorld,
  worldToCampCell,
  getCampWorldBounds,
  CAMP_CELL_SIZE,
  CAMP_ORIGIN,
} from './CampCoordinateMapper';
import type { CampCell } from '@psyblr/contracts';

describe('CampCoordinateMapper', () => {
  it('maps (0, 0) to the northwest corner of the 6x6 camp', () => {
    const worldPos = campCellToWorld({ x: 0, y: 0 });
    // (0 - 2.5) * 1.25 = -3.125
    expect(worldPos[0]).toBeCloseTo(-3.125);
    expect(worldPos[1]).toBe(CAMP_ORIGIN[1]);
    expect(worldPos[2]).toBeCloseTo(-3.125);
  });

  it('maps (5, 5) to the southeast corner of the 6x6 camp', () => {
    const worldPos = campCellToWorld({ x: 5, y: 5 });
    // (5 - 2.5) * 1.25 = 3.125
    expect(worldPos[0]).toBeCloseTo(3.125);
    expect(worldPos[1]).toBe(CAMP_ORIGIN[1]);
    expect(worldPos[2]).toBeCloseTo(3.125);
  });

  it('maps center cells accurately and bidirectionally', () => {
    const testCells: CampCell[] = [
      { x: 0, y: 0 },
      { x: 2, y: 3 },
      { x: 5, y: 0 },
      { x: 3, y: 2 },
      { x: 5, y: 5 },
    ];

    for (const cell of testCells) {
      const [wx, wy, wz] = campCellToWorld(cell);
      const roundTripped = worldToCampCell({ x: wx, z: wz });
      expect(roundTripped).toEqual(cell);
    }
  });

  it('returns null for world coordinates outside the 6x6 grid', () => {
    expect(worldToCampCell({ x: -10, z: 0 })).toBeNull();
    expect(worldToCampCell({ x: 0, z: 10 })).toBeNull();
    expect(worldToCampCell({ x: 4.0, z: 0 })).toBeNull(); // Beyond +3.75 bound
    expect(worldToCampCell({ x: -4.0, z: 0 })).toBeNull(); // Beyond -3.75 bound
  });

  it('calculates world bounds spanning exactly 6 cells of cellSize', () => {
    const bounds = getCampWorldBounds();
    const expectedHalf = (6 * CAMP_CELL_SIZE) / 2; // 3.75
    expect(bounds.minX).toBeCloseTo(-expectedHalf);
    expect(bounds.maxX).toBeCloseTo(expectedHalf);
    expect(bounds.minZ).toBeCloseTo(-expectedHalf);
    expect(bounds.maxZ).toBeCloseTo(expectedHalf);
  });
});
