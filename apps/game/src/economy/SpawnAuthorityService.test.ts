import { describe, it, expect } from 'vitest';
import { SpawnAuthorityService } from './SpawnAuthorityService';
import type { CampPlacement } from '@psyblr/contracts';

describe('SpawnAuthorityService', () => {
  it('initializes with 10 balls and 6 daily pool slots', () => {
    const service = new SpawnAuthorityService();
    expect(service.getBallsRemaining()).toBe(10);

    const pool = service.getDailyPool();
    expect(pool.length).toBe(6);

    const totalProb = pool.reduce((acc, slot) => acc + slot.probability, 0);
    expect(totalProb).toBeCloseTo(1.0, 4);
  });

  it('resolves spawn request authoritatively and decrements ball count', async () => {
    const service = new SpawnAuthorityService();
    const initialPlacements: CampPlacement[] = [
      { summonInstanceId: 'starter:goku:001', cell: { x: 2, y: 3 } },
    ];

    const result = await service.requestReleaseBall(initialPlacements, 'test_action_001');

    expect(result.clientActionId).toBe('test_action_001');
    expect(result.rewardSlot).toBeGreaterThanOrEqual(0);
    expect(result.rewardSlot).toBeLessThanOrEqual(5);
    expect(result.createdSummon.tier).toBe('F');
    expect(result.destination.cell.x).toBeGreaterThanOrEqual(0);
    expect(result.destination.cell.x).toBeLessThan(6);
    expect(result.destination.cell.y).toBeGreaterThanOrEqual(0);
    expect(result.destination.cell.y).toBeLessThan(6);
    expect(result.ballsRemaining).toBe(9);
    expect(service.getBallsRemaining()).toBe(9);
  });
});
