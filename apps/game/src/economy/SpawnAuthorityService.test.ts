import { describe, it, expect, beforeEach } from 'vitest';
import { SpawnAuthorityService } from './SpawnAuthorityService';
import type { CampPlacement } from '@psyblr/contracts';

describe('SpawnAuthorityService', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('initializes with 0 wallet medals, 100 dealer stock, and 6 daily pool slots totaling 100%', () => {
    const service = new SpawnAuthorityService();
    expect(service.getMedalsRemaining()).toBe(0);
    expect(service.getDealerStock()).toBe(100);

    const pool = service.getDailyPool();
    expect(pool.length).toBe(6);

    const totalProb = pool.reduce((acc, slot) => acc + slot.probability, 0);
    expect(totalProb).toBeCloseTo(1.0, 4);

    // All normal drops are F-tier
    for (const slot of pool) {
      expect(slot.tier).toBe('F');
    }
  });

  it('collects 100 medals from Dealer into player wallet', async () => {
    const service = new SpawnAuthorityService();
    expect(service.getMedalsRemaining()).toBe(0);
    expect(service.getDealerStock()).toBe(100);
    expect(service.canClaimDealerStock()).toBe(true);

    const result = await service.requestCollectDealerStock();
    expect(result.collectedStock).toBe(100);
    expect(result.newMedalBalance).toBe(100);
    expect(service.getMedalsRemaining()).toBe(100);
    expect(service.getDealerStock()).toBe(0);
  });

  it('resolves spawn request authoritatively and decrements medal count', async () => {
    const service = new SpawnAuthorityService();
    await service.requestCollectDealerStock(); // 100 medals

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
    expect(result.medalsRemaining).toBe(99);
    expect(service.getMedalsRemaining()).toBe(99);
  });

  it('handles release summon and credits refund to wallet', async () => {
    const service = new SpawnAuthorityService();
    await service.requestCollectDealerStock(); // 100 medals
    const gokuS = { id: 's_goku', definitionId: 'goku', tier: 'S' as const };
    const result = await service.requestReleaseSummon(gokuS);

    expect(result.medalsRefunded).toBe(32);
    expect(result.tier).toBe('S');
    expect(service.getMedalsRemaining()).toBe(132);
  });

  it('manages Time Shield with max 8-hour duration and breaks on outgoing raid', () => {
    const service = new SpawnAuthorityService();
    expect(service.isShieldActive()).toBe(false);

    service.grantTimeShieldOnDefenderLoss();
    expect(service.isShieldActive()).toBe(true);
    expect(service.getShieldRemainingTimeMs()).toBeGreaterThan(0);

    service.breakTimeShieldOnOutgoingRaid();
    expect(service.isShieldActive()).toBe(false);
  });
});
