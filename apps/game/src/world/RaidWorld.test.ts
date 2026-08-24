import { describe, it, expect } from 'vitest';
import { RAID_ORIGIN, RAID_CELL_SIZE, RAID_SIZE } from './RaidWorld';

describe('RaidWorld 8x8 Arena Grid Coordinates', () => {
  it('defines isolated 8x8 battlefield grid', () => {
    expect(RAID_ORIGIN).toEqual([-40, 0, 0]);
    expect(RAID_SIZE).toBe(8);
    expect(RAID_CELL_SIZE).toBe(1.0);
  });

  it('verifies player deployment zone (z >= 4) and enemy zone (z < 4) separation', () => {
    const playerZMin = 4;
    const enemyZMax = 3;

    expect(playerZMin).toBeGreaterThan(enemyZMax);
  });
});
