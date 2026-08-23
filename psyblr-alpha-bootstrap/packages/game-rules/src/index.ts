import type { BattleCell, BattlefieldPlacement, CampCell, CampPlacement, CombatFunctionDefinition, OriginDefinition, SummonDefinition, SynergyEffect, Tier } from '@psyblr/contracts';

export const TIERS: readonly Tier[] = ['F','E','D','C','B','A','S','SS','SSS'];
export const TIER_MULTIPLIER: Record<Tier, number> = {F:1,E:1.15,D:1.35,C:1.6,B:1.9,A:2.25,S:2.65,SS:3.1,SSS:3.65};

export function nextTier(tier: Tier): Tier | null {
  const i = TIERS.indexOf(tier);
  return i >= 0 && i < TIERS.length - 1 ? TIERS[i + 1]! : null;
}
export type TierStats = Pick<SummonDefinition['stats'], 'hp' | 'atk' | 'def' | 'attacksPerSecond' | 'range' | 'moveSpeed'>;
export type TierStatDelta = Pick<TierStats, 'hp' | 'atk' | 'def'>;
export type TierFormBand = 'base' | 'major_1' | 'major_2' | 'final';

/** Tier affects only primary power stats in the alpha. Rounding is stable for authoritative replay. */
export function resolveTierStats(stats: SummonDefinition['stats'], tier: Tier): TierStats {
  const multiplier = TIER_MULTIPLIER[tier];
  return { ...stats, hp: Math.round(stats.hp * multiplier), atk: Math.round(stats.atk * multiplier), def: Math.round(stats.def * multiplier) };
}
export function resolveNextTierStats(stats: SummonDefinition['stats'], tier: Tier): TierStats | null {
  const next = nextTier(tier); return next ? resolveTierStats(stats, next) : null;
}
export function nextTierStatDelta(stats: SummonDefinition['stats'], tier: Tier): TierStatDelta | null {
  const current = resolveTierStats(stats, tier); const next = resolveNextTierStats(stats, tier);
  return next ? { hp: next.hp - current.hp, atk: next.atk - current.atk, def: next.def - current.def } : null;
}
export function tierFormBand(tier: Tier): TierFormBand {
  if (tier === 'SSS') return 'final'; if (tier === 'A' || tier === 'S' || tier === 'SS') return 'major_2'; if (tier === 'D' || tier === 'C' || tier === 'B') return 'major_1'; return 'base';
}
export function isMaxTier(tier: Tier): boolean { return nextTier(tier) === null; }

export const CAMP_SIZE = 6;
export const CAMP_CAPACITY = CAMP_SIZE * CAMP_SIZE;
export const ILLUMINATI_CAPACITY = CAMP_SIZE;

export function isCampCell(cell: { x: number; y: number }): cell is CampCell {
  return Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.x < CAMP_SIZE && cell.y >= 0 && cell.y < CAMP_SIZE;
}
export function isIlluminatiCell(cell: CampCell): boolean { return cell.y === 0; }
export function canBeStolen(cell: CampCell): boolean { return !isIlluminatiCell(cell); }
export function isCampCellOccupied(cell: CampCell, placements: readonly CampPlacement[]): boolean {
  return placements.some((placement) => placement.cell.x === cell.x && placement.cell.y === cell.y);
}
export function getCampPlacementForSummon(summonInstanceId: string, placements: readonly CampPlacement[]): CampPlacement | undefined {
  return placements.find((placement) => placement.summonInstanceId === summonInstanceId);
}
export function canPlaceCampSummon(summonInstanceId: string, cell: { x: number; y: number }, placements: readonly CampPlacement[]): boolean {
  if (!summonInstanceId || !isCampCell(cell)) return false;
  const current = getCampPlacementForSummon(summonInstanceId, placements);
  if (current?.cell.x === cell.x && current.cell.y === cell.y) return true;
  if (placements.some((placement) => placement.summonInstanceId !== summonInstanceId && placement.cell.x === cell.x && placement.cell.y === cell.y)) return false;
  return current !== undefined || placements.length < CAMP_CAPACITY;
}
export function moveCampSummon(summonInstanceId: string, cell: { x: number; y: number }, placements: readonly CampPlacement[]): CampPlacement[] {
  if (!canPlaceCampSummon(summonInstanceId, cell, placements)) return [...placements];
  const current = getCampPlacementForSummon(summonInstanceId, placements);
  if (current?.cell.x === cell.x && current.cell.y === cell.y) return [...placements];
  return [...placements.filter((placement) => placement.summonInstanceId !== summonInstanceId), { summonInstanceId, cell }];
}
export function countCampOccupancy(placements: readonly CampPlacement[]): number { return placements.length; }
export function countIlluminatiOccupancy(placements: readonly CampPlacement[]): number { return placements.filter((placement) => isIlluminatiCell(placement.cell)).length; }
export function isIlluminatiFull(placements: readonly CampPlacement[]): boolean { return countIlluminatiOccupancy(placements) === ILLUMINATI_CAPACITY; }
export function findFirstExposedCampCell(placements: readonly CampPlacement[]): CampCell | null {
  for (let y = 1; y < CAMP_SIZE; y += 1) for (let x = 0; x < CAMP_SIZE; x += 1) if (!isCampCellOccupied({ x, y }, placements)) return { x, y };
  return null;
}

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

export type ResolvedSynergy = {
  kind: 'origin' | 'combatFunction'; id: string; name: string; count: number;
  activeThreshold: { count: number; effect: string; mechanics: SynergyEffect[] } | null;
  nextThreshold: { count: number; effect: string } | null;
};
export type SummonSynergyModifiers = { maxHpPct: number; attackSpeedPct: number; skillPowerPct: number; basicAttackDamagePct: number; statusDurationPct: number; durabilityPct: number };
export type FormationSynergy = { entries: ResolvedSynergy[]; byDefinitionId: Record<string, SummonSynergyModifiers> };
const emptyModifiers = (): SummonSynergyModifiers => ({ maxHpPct: 0, attackSpeedPct: 0, skillPowerPct: 0, basicAttackDamagePct: 0, statusDurationPct: 0, durabilityPct: 0 });
const modifierKey: Record<SynergyEffect['stat'], keyof SummonSynergyModifiers> = { max_hp_pct: 'maxHpPct', attack_speed_pct: 'attackSpeedPct', skill_power_pct: 'skillPowerPct', basic_attack_damage_pct: 'basicAttackDamagePct', status_duration_pct: 'statusDurationPct', durability_pct: 'durabilityPct' };

export function resolveFormationSynergies(
  summons: readonly SummonDefinition[], origins: readonly OriginDefinition[], combatFunctions: readonly CombatFunctionDefinition[],
): FormationSynergy {
  const resolve = (kind: ResolvedSynergy['kind'], definitions: readonly (OriginDefinition | CombatFunctionDefinition)[], key: 'originId' | 'combatFunctionId'): ResolvedSynergy[] => definitions.map((definition) => {
    const count = summons.filter((summon) => summon[key] === definition.id).length;
    const thresholds = [...definition.thresholds].sort((a, b) => a.count - b.count);
    const activeThreshold = thresholds.filter((threshold) => threshold.count <= count).at(-1) ?? null;
    const nextThreshold = thresholds.find((threshold) => threshold.count > count) ?? null;
    return { kind, id: definition.id, name: definition.name, count, activeThreshold, nextThreshold };
  });
  const entries = [...resolve('origin', origins, 'originId'), ...resolve('combatFunction', combatFunctions, 'combatFunctionId')];
  const byDefinitionId: Record<string, SummonSynergyModifiers> = {};
  for (const summon of summons) {
    const modifiers = emptyModifiers();
    for (const entry of entries) {
      const belongs = entry.kind === 'origin' ? summon.originId === entry.id : summon.combatFunctionId === entry.id;
      if (!belongs || !entry.activeThreshold) continue;
      for (const effect of entry.activeThreshold.mechanics) modifiers[modifierKey[effect.stat]] += effect.value;
    }
    byDefinitionId[summon.id] = modifiers;
  }
  return { entries, byDefinitionId };
}
