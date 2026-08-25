import { describe, it, expect } from 'vitest';
import { canMerge, nextTier, TIERS } from '@psyblr/game-rules';
import type { SummonInstance } from '@psyblr/contracts';

describe('Summon Merge Interaction and Tier Progression', () => {
  it('allows merging two identical summons of the same tier', () => {
    const goku1: SummonInstance = { id: 'goku_1', definitionId: 'goku', tier: 'F' };
    const goku2: SummonInstance = { id: 'goku_2', definitionId: 'goku', tier: 'F' };

    expect(canMerge(goku1, goku2)).toBe(true);
    expect(nextTier(goku1.tier)).toBe('E');
  });

  it('rejects merging summons of different identities or different tiers or at max tier X', () => {
    const goku: SummonInstance = { id: 'goku_1', definitionId: 'goku', tier: 'F' };
    const naruto: SummonInstance = { id: 'naruto_1', definitionId: 'naruto', tier: 'F' };
    const gokuTierE: SummonInstance = { id: 'goku_2', definitionId: 'goku', tier: 'E' };
    const gokuTierX1: SummonInstance = { id: 'goku_x1', definitionId: 'goku', tier: 'X' };
    const gokuTierX2: SummonInstance = { id: 'goku_x2', definitionId: 'goku', tier: 'X' };

    expect(canMerge(goku, naruto)).toBe(false);
    expect(canMerge(goku, gokuTierE)).toBe(false);
    expect(canMerge(gokuTierX1, gokuTierX2)).toBe(false);
  });

  it('progresses tiers sequentially across all 10 tiers up to X', () => {
    expect(TIERS).toEqual(['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X']);
    expect(nextTier('F')).toBe('E');
    expect(nextTier('E')).toBe('D');
    expect(nextTier('D')).toBe('C');
    expect(nextTier('C')).toBe('B');
    expect(nextTier('B')).toBe('A');
    expect(nextTier('A')).toBe('S');
    expect(nextTier('S')).toBe('SS');
    expect(nextTier('SS')).toBe('SSS');
    expect(nextTier('SSS')).toBe('X');
    expect(nextTier('X')).toBeNull();
  });
});
