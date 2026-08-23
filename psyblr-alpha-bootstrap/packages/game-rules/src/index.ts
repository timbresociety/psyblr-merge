import { RaidSquadDraftSchema, RaidSquadSnapshotSchema, type BattleCell, type BattlefieldPlacement, type CampCell, type CampPlacement, type CombatFunctionDefinition, type OriginDefinition, type RaidRoundDefinition, type RaidRoundId, type RaidSquadDraft, type RaidSquadSnapshot, type RaidSummonSnapshot, type SummonDefinition, type SummonInstance, type SynergyEffect, type Tier } from '@psyblr/contracts';

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

export const RAID_ROUND_DEFINITIONS: readonly RaidRoundDefinition[] = [
  { id: 'round1', number: 1, slotCount: 2 },
  { id: 'round2', number: 2, slotCount: 4 },
  { id: 'round3', number: 3, slotCount: 6 },
] as const;
export function getRaidRoundDefinition(id: RaidRoundId): RaidRoundDefinition { return RAID_ROUND_DEFINITIONS.find((round) => round.id === id)!; }
export function createEmptyRaidSquadDraft(): RaidSquadDraft { return { round1: [null, null], round2: [null, null, null, null], round3: [null, null, null, null, null, null] }; }
function cloneRaidDraft(draft: RaidSquadDraft): RaidSquadDraft { return { round1: [...draft.round1], round2: [...draft.round2], round3: [...draft.round3] }; }
export function isRaidRoundComplete(draft: RaidSquadDraft, roundId: RaidRoundId): boolean { return draft[roundId].every((id): id is string => id !== null) && new Set(draft[roundId]).size === draft[roundId].length; }
export function isRaidDraftComplete(draft: RaidSquadDraft): boolean { return RAID_ROUND_DEFINITIONS.every((round) => isRaidRoundComplete(draft, round.id)); }
export function sanitizeRaidDraft(value: unknown, inventory: readonly SummonInstance[]): { draft: RaidSquadDraft; error: string | null } {
  const parsed = RaidSquadDraftSchema.safeParse(value); if (!parsed.success) return { draft: createEmptyRaidSquadDraft(), error: 'Raid squad draft was invalid and was reset.' };
  const owned = new Set(inventory.map((instance) => instance.id)); const draft = cloneRaidDraft(parsed.data); let stale = false;
  for (const round of RAID_ROUND_DEFINITIONS) for (let index = 0; index < draft[round.id].length; index += 1) { const id = draft[round.id][index]; if (id && !owned.has(id)) { draft[round.id][index] = null; stale = true; } }
  return { draft, error: stale ? 'Unavailable Summons were removed from the raid draft.' : null };
}
export type RaidDraftMutation = { draft: RaidSquadDraft; error: string | null };
export function selectRaidSummon(draft: RaidSquadDraft, roundId: RaidRoundId, instanceId: string, inventory: readonly SummonInstance[]): RaidDraftMutation {
  if (!inventory.some((instance) => instance.id === instanceId)) return { draft, error: 'That Summon is no longer owned.' };
  const slots = draft[roundId]; if (slots.includes(instanceId)) return { draft, error: 'This Summon already occupies a slot in this round.' };
  const emptyIndex = slots.findIndex((id) => id === null); if (emptyIndex < 0) return { draft, error: 'Round full — remove a Summon first.' };
  const next = cloneRaidDraft(draft); next[roundId][emptyIndex] = instanceId; return { draft: next, error: null };
}
export function removeRaidSummon(draft: RaidSquadDraft, roundId: RaidRoundId, slotIndex: number): RaidDraftMutation {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= draft[roundId].length) return { draft, error: 'That raid slot is unavailable.' };
  const next = cloneRaidDraft(draft); next[roundId][slotIndex] = null; return { draft: next, error: null };
}
/** Locks only the currently deployed field; later rounds remain editable until reached. */
export function finalizeRaidRoundDraft(draftValue: unknown, inventory: readonly SummonInstance[], roundId: RaidRoundId): { ok: true; squad: RaidSummonSnapshot[] } | { ok: false; error: string } {
  const parsed = RaidSquadDraftSchema.safeParse(draftValue); if (!parsed.success) return { ok: false, error: 'Raid formation is malformed.' };
  const slots = parsed.data[roundId]; if (!slots.every((id): id is string => id !== null) || new Set(slots).size !== slots.length) return { ok: false, error: `Deploy ${getRaidRoundDefinition(roundId).slotCount} unique Summons for this round.` };
  const byId = new Map(inventory.map((instance) => [instance.id, instance])); const squad = slots.map((id) => { const instance = byId.get(id!); return instance ? { instanceId: instance.id, definitionId: instance.definitionId, tier: instance.tier } : null; });
  return squad.some((item) => item === null) ? { ok: false, error: 'A selected Summon is no longer owned.' } : { ok: true, squad: squad as RaidSummonSnapshot[] };
}
export function finalizeRaidSquadDraft(draftValue: unknown, inventory: readonly SummonInstance[], clientActionId: string, contentVersion: string): { ok: true; snapshot: RaidSquadSnapshot } | { ok: false; error: string } {
  const parsed = RaidSquadDraftSchema.safeParse(draftValue); if (!parsed.success) return { ok: false, error: 'Raid squad draft is malformed.' };
  const draft = parsed.data; if (!isRaidDraftComplete(draft)) return { ok: false, error: 'Complete every raid round before starting.' };
  const byId = new Map(inventory.map((instance) => [instance.id, instance]));
  const resolve = (roundId: RaidRoundId) => draft[roundId].map((instanceId) => { const instance = instanceId && byId.get(instanceId); return instance ? { instanceId: instance.id, definitionId: instance.definitionId, tier: instance.tier } : null; });
  const candidate = { clientActionId, contentVersion, round1: resolve('round1'), round2: resolve('round2'), round3: resolve('round3') };
  if (candidate.round1.some((item) => item === null) || candidate.round2.some((item) => item === null) || candidate.round3.some((item) => item === null)) return { ok: false, error: 'A selected Summon is no longer owned.' };
  const snapshot = RaidSquadSnapshotSchema.safeParse(candidate); return snapshot.success ? { ok: true, snapshot: JSON.parse(JSON.stringify(snapshot.data)) as RaidSquadSnapshot } : { ok: false, error: 'Raid squad is invalid.' };
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
