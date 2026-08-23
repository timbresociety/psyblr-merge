import { describe, expect, it } from 'vitest';
import { battleCellToWorld, worldToBattleCell } from './battlefield';

describe('battlefield coordinate mapping', () => {
  it('round-trips representative cells', () => {
    for (const cell of [{ x: 0, z: 0 }, { x: 4, z: 4 }, { x: 7, z: 7 }]) {
      const [x, , z] = battleCellToWorld(cell);
      expect(worldToBattleCell({ x, z })).toEqual(cell);
    }
  });

  it('resolves center and edge cells while rejecting outside points', () => {
    expect(worldToBattleCell({ x: -4.99, z: 4.99 })).toEqual({ x: 0, z: 7 });
    expect(worldToBattleCell({ x: 4.99, z: -4.99 })).toEqual({ x: 7, z: 0 });
    expect(worldToBattleCell({ x: 5, z: 0 })).toBeNull();
    expect(worldToBattleCell({ x: -5.01, z: 0 })).toBeNull();
  });
});
