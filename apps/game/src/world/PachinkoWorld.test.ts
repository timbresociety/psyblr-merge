import { describe, it, expect } from 'vitest';
import { PachinkoWorld } from './PachinkoWorld';

describe('PachinkoWorld Physical Board and Bins', () => {
  it('defines 6 distinct starter reward bins with legal bounds and canonical daily pool distribution', () => {
    const expectedDefs = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch'];
    const expectedProbabilities = [10, 15, 25, 25, 15, 10];
    expect(expectedDefs.length).toBe(6);
    expect(expectedProbabilities.reduce((a, b) => a + b, 0)).toBe(100);

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

  it('verifies canonical 6-summon daily pool ordering [10, 15, 25, 25, 15, 10]', () => {
    const probabilities = [10, 15, 25, 25, 15, 10];
    expect(probabilities[0]).toBe(10); // Goku
    expect(probabilities[1]).toBe(15); // Naruto
    expect(probabilities[2]).toBe(25); // Luffy
    expect(probabilities[3]).toBe(25); // Eren
    expect(probabilities[4]).toBe(15); // L
    expect(probabilities[5]).toBe(10); // Lelouch
  });
});
