import { describe, expect, it } from 'vitest';
import { createStarterSummonInstances } from '@psyblr/game-content';
import { createInitialCampPlacements } from './gameStore';

describe('base initialization', () => {
  it('uses the same campaign instance ids on deterministic exposed row three', () => {
    const inventory = createStarterSummonInstances();
    const campaign = inventory.map((instance, index) => ({ summonInstanceId: instance.id, cell: { x: index, z: 4 } }));
    const camp = createInitialCampPlacements(inventory, campaign);
    expect(camp).toHaveLength(6);
    expect(camp.map((placement) => placement.summonInstanceId)).toEqual(campaign.map((placement) => placement.summonInstanceId));
    expect(camp.map((placement) => placement.cell)).toEqual(Array.from({ length: 6 }, (_, x) => ({ x, y: 3 })));
  });
  it('has a deterministic owned-starter fallback without duplication', () => {
    const inventory = createStarterSummonInstances();
    const camp = createInitialCampPlacements(inventory, []);
    expect(new Set(camp.map((placement) => placement.summonInstanceId)).size).toBe(6);
  });
});
