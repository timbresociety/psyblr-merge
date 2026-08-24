import { describe, it, expect, beforeEach } from 'vitest';
import { SpawnAuthorityService } from './SpawnAuthorityService';
import type { CampPlacement } from '@psyblr/contracts';

describe('SpawnAuthorityService', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  const createService = () => new SpawnAuthorityService({ allowDevelopmentFallback: true });

  it('initializes with 100 balls and the six all-F daily pool slots', () => {
    const service = createService();
    expect(service.getBallsRemaining()).toBe(100);

    const pool = service.getDailyPool();
    expect(pool).toHaveLength(6);
    expect(pool.map((slot) => slot.probability)).toEqual([0.10, 0.15, 0.25, 0.25, 0.15, 0.10]);
    expect(pool.every((slot) => slot.tier === 'F')).toBe(true);
    expect(pool.reduce((acc, slot) => acc + slot.probability, 0)).toBeCloseTo(1.0, 4);
  });

  it('resolves a development spawn and decrements exactly one Ball', async () => {
    const service = createService();
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
    expect(result.ballsRemaining).toBe(99);
    expect(service.getBallsRemaining()).toBe(99);
  });

  it('rejects a full 36-cell Camp before consuming a Ball', async () => {
    const service = createService();
    const fullCamp: CampPlacement[] = [];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        fullCamp.push({ summonInstanceId: `summon:${x}:${y}`, cell: { x, y } });
      }
    }

    await expect(service.requestReleaseBall(fullCamp, 'full-camp')).rejects.toThrow(/full/i);
    expect(service.getBallsRemaining()).toBe(100);
  });

  it('grants an hour of shield on the fifth development bumper charge', () => {
    const service = createService();
    expect(service.isShieldActive()).toBe(false);

    for (let i = 0; i < 4; i++) {
      const charge = service.addBumperBounceCharge();
      expect(charge.shieldGranted).toBe(false);
      expect(charge.currentCharges).toBe(i + 1);
    }

    const fifth = service.addBumperBounceCharge();
    expect(fifth.shieldGranted).toBe(true);
    expect(fifth.currentCharges).toBe(0);
    expect(service.isShieldActive()).toBe(true);
    expect(service.getShieldRemainingTimeMs()).toBeGreaterThan(0);
    expect(service.getShieldRemainingTimeMs()).toBeLessThanOrEqual(8 * 60 * 60 * 1000);
  });

  it('Dealer refills a sub-100 balance to 100 and then enforces cooldown', () => {
    const service = createService();
    expect(service.canClaimDailyDealer()).toBe(false);

    service.addBalls(-40);
    expect(service.getBallsRemaining()).toBe(60);
    expect(service.canClaimDailyDealer()).toBe(true);

    const claim = service.claimDailyDealerBalls();
    expect(claim.success).toBe(true);
    expect(claim.ballsGranted).toBe(40);
    expect(service.getBallsRemaining()).toBe(100);

    service.addBalls(-10);
    expect(service.canClaimDailyDealer()).toBe(false);
    expect(service.getTimeUntilNextDealerClaimMs()).toBeGreaterThan(0);
  });
});
