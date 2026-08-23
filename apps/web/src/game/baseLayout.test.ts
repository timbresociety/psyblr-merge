import { describe, expect, it } from 'vitest';
import { campCellToWorld, worldToCampCell } from './baseLayout';

describe('base camp coordinate mapping', () => {
  it('maps all camp cells to unique positions and round-trips them', () => {
    const positions = new Set<string>();
    for (let y = 0; y < 6; y += 1) for (let x = 0; x < 6; x += 1) {
      const [worldX, , worldZ] = campCellToWorld({ x, y });
      positions.add(`${worldX}:${worldZ}`);
      expect(worldToCampCell({ x: worldX, z: worldZ })).toEqual({ x, y });
    }
    expect(positions.size).toBe(36);
  });
  it('rejects world points outside the camp', () => {
    expect(worldToCampCell({ x: 99, z: 0 })).toBeNull();
    expect(worldToCampCell({ x: 0, z: -99 })).toBeNull();
  });
});
