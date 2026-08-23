import { describe, expect, it } from 'vitest';
import type { BattlefieldPlacement, CampPlacement } from '@psyblr/contracts';
import { combatFunctionDefinitions, originDefinitions, summonDefinitions } from '@psyblr/game-content';
import {
  canDeploySummon,
  isBattleCellOccupied,
  isPlayerDeploymentCell,
  MAX_PLAYER_DEPLOYED_SUMMONS,
  recallBattlefieldPlacement,
  resolveFormationSynergies,
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
} from './index';

const placement = (summonInstanceId: string, x: number, z: number): BattlefieldPlacement => ({
  summonInstanceId,
  cell: { x, z },
});

describe('formation synergies', () => {
  it('activates each starter pair only for its members', () => {
    const one = resolveFormationSynergies([summonDefinitions[0]!], originDefinitions, combatFunctionDefinitions);
    expect(one.entries.find((entry) => entry.id === 'ascendant')?.activeThreshold).toBeNull();
    const all = resolveFormationSynergies(summonDefinitions, originDefinitions, combatFunctionDefinitions);
    expect(all.entries.filter((entry) => entry.activeThreshold?.count === 2)).toHaveLength(6);
    expect(all.byDefinitionId.goku?.attackSpeedPct).toBe(.08);
    expect(all.byDefinitionId.goku?.basicAttackDamagePct).toBe(.1);
    expect(all.byDefinitionId.naruto?.statusDurationPct).toBe(.1);
    expect(all.byDefinitionId.eren?.maxHpPct).toBe(.08);
    expect(all.byDefinitionId.eren?.durabilityPct).toBe(.1);
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
  it('validates the 6 by 6 grid and protects only row zero', () => {
    expect(isCampCell({ x: 0, y: 0 })).toBe(true);
    expect(isCampCell({ x: 5, y: 5 })).toBe(true);
    expect(isCampCell({ x: 6, y: 0 })).toBe(false);
    expect(isCampCell({ x: 0, y: -1 })).toBe(false);
    expect(isCampCell({ x: 1.5, y: 2 })).toBe(false);
    expect(isIlluminatiCell({ x: 2, y: 0 })).toBe(true);
    expect(canBeStolen({ x: 2, y: 0 })).toBe(false);
    expect(canBeStolen({ x: 2, y: 1 })).toBe(true);
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
