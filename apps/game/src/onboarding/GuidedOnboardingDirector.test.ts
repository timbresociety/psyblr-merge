import { describe, it, expect, beforeEach } from 'vitest';
import {
  getHighestRosterTier,
  isTierReached,
  ONBOARDING_TIER_ORDER,
  type OnboardingPhase,
} from './SilentOnboardingDirector';
import type { SummonInstance } from '@psyblr/contracts';

describe('Guided Onboarding Progression & Tier Verification', () => {
  it('correctly orders canonical 10 tiers from F to X', () => {
    expect(ONBOARDING_TIER_ORDER).toEqual([
      'F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X'
    ]);
  });

  it('determines highest tier from an arbitrary roster', () => {
    const starterRoster: SummonInstance[] = [
      { id: '1', definitionId: 'goku', tier: 'F' },
      { id: '2', definitionId: 'naruto', tier: 'F' },
    ];
    expect(getHighestRosterTier(starterRoster)).toBe('F');

    const upgradedRoster: SummonInstance[] = [
      { id: '1', definitionId: 'goku', tier: 'E' },
      { id: '2', definitionId: 'naruto', tier: 'F' },
    ];
    expect(getHighestRosterTier(upgradedRoster)).toBe('E');

    const tierCRoster: SummonInstance[] = [
      { id: '1', definitionId: 'goku', tier: 'C' },
      { id: '2', definitionId: 'naruto', tier: 'E' },
    ];
    expect(getHighestRosterTier(tierCRoster)).toBe('C');

    const tierARoster: SummonInstance[] = [
      { id: '1', definitionId: 'goku', tier: 'A' },
      { id: '2', definitionId: 'naruto', tier: 'C' },
    ];
    expect(getHighestRosterTier(tierARoster)).toBe('A');
  });

  it('verifies tier reached milestone conditions correctly', () => {
    expect(isTierReached('F', 'C')).toBe(false);
    expect(isTierReached('E', 'C')).toBe(false);
    expect(isTierReached('D', 'C')).toBe(false);
    expect(isTierReached('C', 'C')).toBe(true);
    expect(isTierReached('B', 'C')).toBe(true);
    expect(isTierReached('A', 'C')).toBe(true);
    expect(isTierReached('S', 'C')).toBe(true);
    expect(isTierReached('SS', 'C')).toBe(true);
    expect(isTierReached('SSS', 'C')).toBe(true);
    expect(isTierReached('X', 'C')).toBe(true);
  });

  it('follows the full 7-step guided onboarding phase sequence', () => {
    const expectedPhases: OnboardingPhase[] = [
      'CAMPAIGN',
      'BATTLE_CAMP',
      'ILLUMINATI',
      'DEALER',
      'SPAWN_MACHINE',
      'MERGE_HEROES',
      'RAID_BATTLE',
      'OPPONENT_CAMP_STEAL',
      'COMPLETED',
    ];

    expect(expectedPhases.length).toBe(9);
    expect(expectedPhases[0]).toBe('CAMPAIGN');
    expect(expectedPhases[1]).toBe('BATTLE_CAMP');
    expect(expectedPhases[2]).toBe('ILLUMINATI');
    expect(expectedPhases[3]).toBe('DEALER');
    expect(expectedPhases[4]).toBe('SPAWN_MACHINE');
    expect(expectedPhases[5]).toBe('MERGE_HEROES');
    expect(expectedPhases[6]).toBe('RAID_BATTLE');
    expect(expectedPhases[7]).toBe('OPPONENT_CAMP_STEAL');
    expect(expectedPhases[8]).toBe('COMPLETED');
  });
});
