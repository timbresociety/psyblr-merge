import type { BattleCell, BattlefieldPlacement, CampCell, Tier } from '@psyblr/contracts';

export const TIERS: readonly Tier[] = ['F','E','D','C','B','A','S','SS','SSS'];
export const TIER_MULTIPLIER: Record<Tier, number> = {F:1,E:1.15,D:1.35,C:1.6,B:1.9,A:2.25,S:2.65,SS:3.1,SSS:3.65};

export function nextTier(tier: Tier): Tier | null {
  const i = TIERS.indexOf(tier);
  return i >= 0 && i < TIERS.length - 1 ? TIERS[i + 1]! : null;
}

export function isIlluminatiCell(cell: CampCell): boolean { return cell.y === 0; }
export function canBeStolen(cell: CampCell): boolean { return !isIlluminatiCell(cell); }

export function canMerge(a: {definitionId:string;tier:Tier}, b: {definitionId:string;tier:Tier}): boolean {
  return a.definitionId === b.definitionId && a.tier === b.tier && nextTier(a.tier) !== null;
}

export const BATTLEFIELD_SIZE = 8;
export const PLAYER_DEPLOYMENT_MIN_Z = 4;
export const MAX_PLAYER_DEPLOYED_SUMMONS = 6;

export function isBattleCell(cell: { x: number; z: number }): cell is BattleCell {
  return Number.isInteger(cell.x)
    && Number.isInteger(cell.z)
    && cell.x >= 0
    && cell.x < BATTLEFIELD_SIZE
    && cell.z >= 0
    && cell.z < BATTLEFIELD_SIZE;
}

export function isPlayerDeploymentCell(cell: { x: number; z: number }): cell is BattleCell {
  return isBattleCell(cell) && cell.z >= PLAYER_DEPLOYMENT_MIN_Z;
}

export function isBattleCellOccupied(cell: BattleCell, placements: readonly BattlefieldPlacement[]): boolean {
  return placements.some((placement) => placement.cell.x === cell.x && placement.cell.z === cell.z);
}

export function canDeploySummon(
  summonInstanceId: string,
  cell: { x: number; z: number },
  placements: readonly BattlefieldPlacement[],
): boolean {
  if (!isPlayerDeploymentCell(cell)) return false;

  const currentPlacement = placements.find((placement) => placement.summonInstanceId === summonInstanceId);
  const occupiedByAnotherSummon = placements.some((placement) => (
    placement.summonInstanceId !== summonInstanceId
    && placement.cell.x === cell.x
    && placement.cell.z === cell.z
  ));
  if (occupiedByAnotherSummon) return false;

  return currentPlacement !== undefined || placements.length < MAX_PLAYER_DEPLOYED_SUMMONS;
}

export function recallBattlefieldPlacement(
  summonInstanceId: string,
  placements: readonly BattlefieldPlacement[],
): BattlefieldPlacement[] {
  return placements.filter((placement) => placement.summonInstanceId !== summonInstanceId);
}
