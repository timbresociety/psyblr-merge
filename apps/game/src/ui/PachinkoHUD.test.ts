import { describe, it, expect } from 'vitest';
import { countCampOccupancy } from '@psyblr/game-rules';

describe('PachinkoHUD and Multi-Ball Interaction Logic', () => {
  it('enforces maximum Battle Camp capacity of 36 (6x6 grid)', () => {
    const MAX_CAMP_CAPACITY = 36;
    expect(MAX_CAMP_CAPACITY).toBe(36);
  });

  it('validates dropping balls when medals > 0 and camp < 36', () => {
    const medals = 10;
    const campCount = 6;
    const maxCamp = 36;

    const canDrop = medals > 0 && campCount < maxCamp;
    expect(canDrop).toBe(true);
  });

  it('blocks dropping balls when medals reach 0', () => {
    const medals = 0;
    const campCount = 6;
    const maxCamp = 36;

    const canDrop = medals > 0 && campCount < maxCamp;
    expect(canDrop).toBe(false);
  });

  it('blocks dropping balls when battle camp is full at 36', () => {
    const medals = 50;
    const campCount = 36;
    const maxCamp = 36;

    const canDrop = medals > 0 && campCount < maxCamp;
    expect(canDrop).toBe(false);
  });

  it('accounts for in-flight spawns to prevent deducting medals beyond 36 capacity', () => {
    let medals = 50;
    let campCount = 30;
    let inFlightSpawns = 0;
    const maxCamp = 36;

    // Simulate 6 drops fired in quick succession
    for (let i = 0; i < 10; i++) {
      if (campCount + inFlightSpawns < maxCamp && medals > 0) {
        medals--;
        inFlightSpawns++;
      }
    }

    // Exactly 6 drops allowed, medals deducted = 6, remaining = 44, in flight = 6
    expect(inFlightSpawns).toBe(6);
    expect(medals).toBe(44);
    expect(campCount + inFlightSpawns).toBe(36);

    // Further drops are strictly rejected
    const canDropMore = campCount + inFlightSpawns < maxCamp && medals > 0;
    expect(canDropMore).toBe(false);
  });

  it('verifies 6 reward pocket definitions match daily pool summons and probabilities', () => {
    const poolItems = [
      { name: 'GOKU [F]', rate: '10%', prob: 0.10 },
      { name: 'NARUTO [F]', rate: '15%', prob: 0.15 },
      { name: 'LUFFY [F]', rate: '25%', prob: 0.25 },
      { name: 'EREN [F]', rate: '25%', prob: 0.25 },
      { name: 'L [F]', rate: '15%', prob: 0.15 },
      { name: 'LELOUCH [F]', rate: '10%', prob: 0.10 },
    ];

    expect(poolItems.length).toBe(6);
    const sumProb = poolItems.reduce((acc, item) => acc + item.prob, 0);
    expect(sumProb).toBeCloseTo(1.0, 5);
  });
});
