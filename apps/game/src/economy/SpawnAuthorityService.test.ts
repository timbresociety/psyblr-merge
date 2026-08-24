import { describe, it, expect, beforeEach } from 'vitest';
import { SpawnAuthorityService } from './SpawnAuthorityService';
import type { CampPlacement } from '@psyblr/contracts';

describe('SpawnAuthorityService', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('initializes with 100 balls and 6 daily pool slots', () => {
    const service = new SpawnAuthorityService();
    expect(service.getBallsRemaining()).toBe(100);

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
    expect(['F', 'E', 'D', 'C']).toContain(result.createdSummon.tier);
    expect(result.destination.cell.x).toBeGreaterThanOrEqual(0);
    expect(result.destination.cell.x).toBeLessThan(6);
    expect(result.destination.cell.y).toBeGreaterThanOrEqual(0);
    expect(result.destination.cell.y).toBeLessThan(6);
    expect(result.ballsRemaining).toBe(99);
    expect(service.getBallsRemaining()).toBe(99);
  });

  it('handles shield bumper bounce charges and 1-hour shield activation', () => {
    const service = new SpawnAuthorityService();
    expect(service.isShieldActive()).toBe(false);

    // 4 bumper bounces
    for (let i = 0; i < 4; i++) {
      const charge = service.addBumperBounceCharge();
      expect(charge.shieldGranted).toBe(false);
      expect(charge.currentCharges).toBe(i + 1);
    }

    // 5th bounce grants shield
    const fifth = service.addBumperBounceCharge();
    expect(fifth.shieldGranted).toBe(true);
    expect(fifth.currentCharges).toBe(0);
    expect(service.isShieldActive()).toBe(true);
    expect(service.getShieldRemainingTimeMs()).toBeGreaterThan(0);
  });

  it('handles dealer 24-hour daily ball claims', () => {
    const service = new SpawnAuthorityService();
    expect(service.canClaimDailyDealer()).toBe(true);

    const claim = service.claimDailyDealerBalls();
    expect(claim.success).toBe(true);
    expect(claim.ballsGranted).toBe(100);
    expect(service.getBallsRemaining()).toBe(200);
  });
});
