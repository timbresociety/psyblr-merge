import { describe, expect, it } from 'vitest';
import type { BattlefieldPlacement } from '@psyblr/contracts';
import {
  canDeploySummon,
  isBattleCellOccupied,
  isPlayerDeploymentCell,
  MAX_PLAYER_DEPLOYED_SUMMONS,
  recallBattlefieldPlacement,
} from './index';

const placement = (summonInstanceId: string, x: number, z: number): BattlefieldPlacement => ({
  summonInstanceId,
  cell: { x, z },
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
