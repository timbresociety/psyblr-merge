import { describe, expect, it } from 'vitest';
import type { BattlefieldPlacement, CampPlacement } from '@psyblr/contracts';
import { allianceDefinitions, summonDefinitions } from '@psyblr/game-content';
import {
  canDeploySummon,
  isBattleCellOccupied,
  isPlayerDeploymentCell,
  MAX_PLAYER_DEPLOYED_SUMMONS,
  recallBattlefieldPlacement,
  resolveAllianceSynergies,
  canBeStolen,
  canPlaceCampSummon,
  countCampOccupancy,
  countIlluminatiOccupancy,
  getCampPlacementForSummon,
  isCampCell,
  isCampCellOccupied,
  isIlluminatiCell,
  isIlluminatiFull,
  moveCampSummon,
  findFirstExposedCampCell,
  canMerge,
  isMaxTier,
  nextTier,
  nextTierStatDelta,
  resolveTierStats,
  tierFormBand,
  getReleaseRefund,
  getFEquivalentSpawnCost,
  resolveSummonPowerLevel,
  resolveFormationPowerLevel,
  resolveAccountPowerLevel,
  calculateDealerAccrual,
  canClaimDealerStock,
  claimDealerStock,
  canEditDefense,
  resolveSurrenderCandidates,
  selectWeakestSurrenderedSummon,
  TIERS,
} from './index';

const placement = (summonInstanceId: string, x: number, z: number): BattlefieldPlacement => ({
  summonInstanceId,
  cell: { x, z },
});

describe('alliance synergies', () => {
  it('activates alliance thresholds based on deployed count', () => {
    const ascendants = summonDefinitions.filter((s) => s.allianceId === 'ascendant');
    const synergies = resolveAllianceSynergies(ascendants, allianceDefinitions);
    const ascEntry = synergies.entries.find((e) => e.id === 'ascendant');
    expect(ascEntry?.activeThreshold?.count).toBe(2);
    expect(ascEntry?.activeThreshold?.effect).toContain('attack speed');
    expect(synergies.byDefinitionId.goku?.attackSpeedPct).toBe(0.08);
  });
});

describe('battlefield placement rules', () => {
  it('allows an F starter in the first player row', () => {
    expect(canDeploySummon('starter:goku:001', { x: 0, z: 4 }, [])).toBe(true);
  });

  it('rejects enemy rows and out-of-bounds cells', () => {
    expect(isPlayerDeploymentCell({ x: 0, z: 3 })).toBe(false);
    expect(canDeploySummon('starter:goku:001', { x: 0, z: 3 }, [])).toBe(false);
    expect(canDeploySummon('starter:goku:001', { x: 8, z: 4 }, [])).toBe(false);
  });

  it('rejects an occupied cell and duplicate deployment', () => {
    const placements = [placement('starter:goku:001', 0, 4)];
    expect(isBattleCellOccupied({ x: 0, z: 4 }, placements)).toBe(true);
    expect(canDeploySummon('starter:naruto:001', { x: 0, z: 4 }, placements)).toBe(false);
    expect(canDeploySummon('starter:goku:001', { x: 1, z: 4 }, placements)).toBe(true);
  });

  it('enforces the six-summon cap but permits a reposition at cap', () => {
    const placements = Array.from({ length: MAX_PLAYER_DEPLOYED_SUMMONS }, (_, index) => placement(`starter:${index}`, index, 4));
    expect(canDeploySummon('starter:new', { x: 6, z: 4 }, placements)).toBe(false);
    expect(canDeploySummon('starter:0', { x: 6, z: 4 }, placements)).toBe(true);
  });

  it('frees capacity after recall removes a placement', () => {
    const placements = Array.from({ length: MAX_PLAYER_DEPLOYED_SUMMONS }, (_, index) => placement(`starter:${index}`, index, 4));
    const afterRecall = recallBattlefieldPlacement('starter:0', placements);
    expect(canDeploySummon('starter:new', { x: 6, z: 4 }, afterRecall)).toBe(true);
  });
});

const camp = (summonInstanceId: string, x: number, y: number): CampPlacement => ({ summonInstanceId, cell: { x, y } });
describe('camp placement rules', () => {
  it('finds exposed empty cells in row-major order and never enters Illuminati', () => {
    expect(findFirstExposedCampCell([])).toEqual({ x: 0, y: 1 });
    const fullExposed = Array.from({ length: 30 }, (_, index) => camp(`spawn:${index}`, index % 6, Math.floor(index / 6) + 1));
    expect(findFirstExposedCampCell(fullExposed)).toBeNull();
  });

  it('validates the 6 by 6 grid and protects only row zero (or rows 0-1 if upgraded)', () => {
    expect(isCampCell({ x: 0, y: 0 })).toBe(true);
    expect(isCampCell({ x: 5, y: 5 })).toBe(true);
    expect(isCampCell({ x: 6, y: 0 })).toBe(false);
    expect(isCampCell({ x: 0, y: -1 })).toBe(false);
    expect(isCampCell({ x: 1.5, y: 2 })).toBe(false);
    expect(isIlluminatiCell({ x: 2, y: 0 })).toBe(true);
    expect(canBeStolen({ x: 2, y: 0 })).toBe(false);
    expect(canBeStolen({ x: 2, y: 1 })).toBe(true);

    // Upgraded 12-slot illuminati
    expect(isIlluminatiCell({ x: 2, y: 1 }, true)).toBe(true);
    expect(canBeStolen({ x: 2, y: 1 }, true)).toBe(false);
    expect(canBeStolen({ x: 2, y: 2 }, true)).toBe(true);
  });

  it('enforces one summon per cell and one cell per summon', () => {
    const placements = [camp('a', 0, 3)];
    expect(isCampCellOccupied({ x: 0, y: 3 }, placements)).toBe(true);
    expect(canPlaceCampSummon('b', { x: 0, y: 3 }, placements)).toBe(false);
    expect(canPlaceCampSummon('a', { x: 1, y: 3 }, placements)).toBe(true);
    expect(canPlaceCampSummon('', { x: 1, y: 3 }, placements)).toBe(false);
  });

  it('moves by replacing the previous placement and treats the current cell as a safe no-op', () => {
    const initial = [camp('a', 0, 3), camp('b', 1, 3)];
    const moved = moveCampSummon('a', { x: 0, y: 0 }, initial);
    expect(moved).toEqual([camp('b', 1, 3), camp('a', 0, 0)]);
    expect(getCampPlacementForSummon('a', moved)).toEqual(camp('a', 0, 0));
    expect(moveCampSummon('a', { x: 0, y: 0 }, moved)).toEqual(moved);
    expect(moveCampSummon('a', { x: 1, y: 3 }, moved)).toEqual(moved);
    expect(moveCampSummon('a', { x: 9, y: 3 }, moved)).toEqual(moved);
  });

  it('counts total and protected occupancy and becomes full only with six unique protected placements', () => {
    const protectedPlacements = Array.from({ length: 6 }, (_, x) => camp(`starter:${x}`, x, 0));
    expect(countCampOccupancy(protectedPlacements)).toBe(6);
    expect(countIlluminatiOccupancy(protectedPlacements)).toBe(6);
    expect(isIlluminatiFull(protectedPlacements)).toBe(true);
    expect(isIlluminatiFull(protectedPlacements.slice(0, 5))).toBe(false);
  });
});

describe('10-tier progression and merge rules', () => {
  it('enforces exactly 10 ordered tiers F through X', () => {
    expect(TIERS).toEqual(['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X']);
    expect(nextTier('F')).toBe('E');
    expect(nextTier('SSS')).toBe('X');
    expect(nextTier('X')).toBeNull();
    expect(isMaxTier('X')).toBe(true);
    expect(isMaxTier('SSS')).toBe(false);
  });

  it('only permits same-definition, same-tier summons below X', () => {
    expect(canMerge({ definitionId: 'goku', tier: 'F' }, { definitionId: 'goku', tier: 'F' })).toBe(true);
    expect(canMerge({ definitionId: 'goku', tier: 'SSS' }, { definitionId: 'goku', tier: 'SSS' })).toBe(true);
    expect(canMerge({ definitionId: 'goku', tier: 'X' }, { definitionId: 'goku', tier: 'X' })).toBe(false);
    expect(canMerge({ definitionId: 'goku', tier: 'F' }, { definitionId: 'naruto', tier: 'F' })).toBe(false);
    expect(canMerge({ definitionId: 'goku', tier: 'F' }, { definitionId: 'goku', tier: 'E' })).toBe(false);
  });

  it('rounds primary stat scaling deterministically and leaves utility stats alone', () => {
    const base = summonDefinitions.find((definition) => definition.id === 'goku')!.stats;
    expect(resolveTierStats(base, 'E')).toMatchObject({
      hp: 1150,
      atk: 138,
      def: 81,
      attacksPerSecond: base.attacksPerSecond,
      range: base.range,
      moveSpeed: base.moveSpeed,
    });
    expect(nextTierStatDelta(base, 'F')).toEqual({ hp: 150, atk: 18, def: 11 });
    expect(tierFormBand('F')).toBe('base');
    expect(tierFormBand('D')).toBe('major_1');
    expect(tierFormBand('A')).toBe('major_2');
    expect(tierFormBand('SSS')).toBe('final');
    expect(tierFormBand('X')).toBe('final');
  });
});

describe('Release economy rules', () => {
  it('refunds exactly 50% of F-equivalent spawn cost across all 10 tiers', () => {
    expect(getFEquivalentSpawnCost('F')).toBe(1);
    expect(getFEquivalentSpawnCost('E')).toBe(2);
    expect(getFEquivalentSpawnCost('D')).toBe(4);
    expect(getFEquivalentSpawnCost('C')).toBe(8);
    expect(getFEquivalentSpawnCost('B')).toBe(16);
    expect(getFEquivalentSpawnCost('A')).toBe(32);
    expect(getFEquivalentSpawnCost('S')).toBe(64);
    expect(getFEquivalentSpawnCost('SS')).toBe(128);
    expect(getFEquivalentSpawnCost('SSS')).toBe(256);
    expect(getFEquivalentSpawnCost('X')).toBe(512);

    expect(getReleaseRefund('F')).toBe(0);
    expect(getReleaseRefund('E')).toBe(1);
    expect(getReleaseRefund('D')).toBe(2);
    expect(getReleaseRefund('C')).toBe(4);
    expect(getReleaseRefund('B')).toBe(8);
    expect(getReleaseRefund('A')).toBe(16);
    expect(getReleaseRefund('S')).toBe(32);
    expect(getReleaseRefund('SS')).toBe(64);
    expect(getReleaseRefund('SSS')).toBe(128);
    expect(getReleaseRefund('X')).toBe(256);
  });
});

describe('Power Level resolver', () => {
  it('resolves deterministic Summon and Formation Power Level', () => {
    const goku = summonDefinitions.find((s) => s.id === 'goku')!;
    const powerF = resolveSummonPowerLevel(goku, 'F');
    const powerE = resolveSummonPowerLevel(goku, 'E');
    const powerX = resolveSummonPowerLevel(goku, 'X');

    expect(powerF).toBeGreaterThan(0);
    expect(powerE).toBeGreaterThan(powerF);
    expect(powerX).toBeGreaterThan(powerE);

    const formationPower = resolveFormationPowerLevel(
      [
        { definition: goku, tier: 'F' },
        { definition: summonDefinitions.find((s) => s.id === 'naruto')!, tier: 'F' },
      ],
      allianceDefinitions
    );
    expect(formationPower).toBeGreaterThan(powerF);
  });

  it('resolves Account Power Level from top 6 camp summons', () => {
    const goku = summonDefinitions.find((s) => s.id === 'goku')!;
    const campSummons = Array.from({ length: 10 }, (_, i) => ({
      definition: goku,
      tier: i === 0 ? ('X' as const) : ('F' as const),
    }));
    const accountPower = resolveAccountPowerLevel(campSummons, allianceDefinitions);
    expect(accountPower).toBeGreaterThan(0);
  });
});

describe('Dealer economy rules', () => {
  it('accrues 100 medals over 12 2-hour epochs and caps at 100 stock', () => {
    const now = 1000000000000;
    const twelveEpochsLater = now + 24 * 60 * 60 * 1000;

    const accrual = calculateDealerAccrual(now, twelveEpochsLater, 0);
    expect(accrual.epochsElapsed).toBe(12);
    expect(accrual.newStock).toBe(100);

    // Caps at 100 even if 48 hours pass
    const fortyEightHoursLater = now + 48 * 60 * 60 * 1000;
    const cappedAccrual = calculateDealerAccrual(now, fortyEightHoursLater, 0);
    expect(cappedAccrual.newStock).toBe(100);
  });

  it('enforces claim gate at wallet < 100 and transfers full stock without clamping wallet to 100', () => {
    expect(canClaimDealerStock(95)).toBe(true);
    expect(canClaimDealerStock(0)).toBe(true);
    expect(canClaimDealerStock(100)).toBe(false);
    expect(canClaimDealerStock(120)).toBe(false);

    // 95 wallet + 25 dealer stock -> 120 wallet, 0 dealer stock
    const claim = claimDealerStock(95, 25);
    expect(claim.newPlayerWallet).toBe(120);
    expect(claim.newDealerStock).toBe(0);
    expect(claim.claimedAmount).toBe(25);
  });
});

describe('Defense editing and Raid rules', () => {
  it('allows defense editing only when time shield is active and no raid lock exists', () => {
    expect(canEditDefense(false, false)).toBe(false); // Inactive shield blocks edit
    expect(canEditDefense(true, true)).toBe(false); // Active raid lock blocks edit
    expect(canEditDefense(true, false)).toBe(true); // Active shield + no lock allows edit
  });

  it('selects weakest surrendered summon across deployed rounds ignoring Illuminati', () => {
    const candidates = [
      { instanceId: 'goku_x', definitionId: 'goku', tier: 'X' as const },
      { instanceId: 'naruto_f', definitionId: 'naruto', tier: 'F' as const },
      { instanceId: 'eren_d', definitionId: 'eren', tier: 'D' as const },
    ];
    const surrenderPool = resolveSurrenderCandidates(candidates);
    expect(surrenderPool).toHaveLength(3);

    const weakest = selectWeakestSurrenderedSummon(surrenderPool, summonDefinitions);
    expect(weakest.instanceId).toBe('naruto_f');
  });
});
