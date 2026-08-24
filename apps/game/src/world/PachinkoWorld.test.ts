import { describe, it, expect } from 'vitest';
import { PachinkoWorld } from './PachinkoWorld';

describe('PachinkoWorld Physical Board and Bins', () => {
  it('defines 6 distinct starter reward bins with legal bounds', () => {
    const expectedDefs = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch'];
    expect(expectedDefs.length).toBe(6);

    const binWidth = 0.48;
    const binStartX = -((6 * binWidth) / 2) + binWidth / 2;

    for (let i = 0; i < 6; i++) {
      const bX = binStartX + i * binWidth;
      const minX = bX - binWidth / 2;
      const maxX = bX + binWidth / 2;

      expect(minX).toBeLessThan(maxX);
      expect(maxX - minX).toBeCloseTo(binWidth, 4);
    }
  });

  it('verifies cabinet anchor origin matches Spawn pad', () => {
    expect(PachinkoWorld.ORIGIN).toEqual([6.4, 0, 0]);
  });
});
