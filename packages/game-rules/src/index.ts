import {
  DefenseSnapshotSchema,
  RaidSquadDraftSchema,
  RaidSquadSnapshotSchema,
  type AllianceDefinition,
  type BattleCell,
  type BattlefieldPlacement,
  type CampCell,
  type CampPlacement,
  type CombatFunctionDefinition,
  type DefenseSnapshot,
  type OriginDefinition,
  type RaidRoundDefinition,
  type RaidRoundId,
  type RaidSquadDraft,
  type RaidSquadSnapshot,
  type RaidSummonSnapshot,
  type SummonDefinition,
  type SummonInstance,
  type SynergyEffect,
  type Tier,
} from '@psyblr/contracts';

// ==========================================
// 1. CANONICAL TIERS (10 Tiers: F through X)
// ==========================================

export const TIERS: readonly Tier[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X'];

export const TIER_MULTIPLIER: Record<Tier, number> = {
  F: 1.0,
  E: 1.15,
  D: 1.35,
  C: 1.6,
  B: 1.9,
  A: 2.25,
  S: 2.65,
  SS: 3.1,
  SSS: 3.65,
  X: 4.3,
};

export function nextTier(tier: Tier): Tier | null {
  const i = TIERS.indexOf(tier);
  return i >= 0 && i < TIERS.length - 1 ? TIERS[i + 1]! : null;
}

export function isMaxTier(tier: Tier): boolean {
  return nextTier(tier) === null;
}

export type TierStats = Pick<SummonDefinition['stats'], 'hp' | 'atk' | 'def' | 'attacksPerSecond' | 'range' | 'moveSpeed'>;
export type TierStatDelta = Pick<TierStats, 'hp' | 'atk' | 'def'>;
export type TierFormBand = 'base' | 'major_1' | 'major_2' | 'final';

export function resolveTierStats(stats: SummonDefinition['stats'], tier: Tier): TierStats {
  const multiplier = TIER_MULTIPLIER[tier];
  return {
    ...stats,
    hp: Math.round(stats.hp * multiplier),
    atk: Math.round(stats.atk * multiplier),
    def: Math.round(stats.def * multiplier),
  };
}

export function resolveNextTierStats(stats: SummonDefinition['stats'], tier: Tier): TierStats | null {
  const next = nextTier(tier);
  return next ? resolveTierStats(stats, next) : null;
}

export function nextTierStatDelta(stats: SummonDefinition['stats'], tier: Tier): TierStatDelta | null {
  const current = resolveTierStats(stats, tier);
  const next = resolveNextTierStats(stats, tier);
  return next ? { hp: next.hp - current.hp, atk: next.atk - current.atk, def: next.def - current.def } : null;
}

export function tierFormBand(tier: Tier): TierFormBand {
  if (tier === 'X' || tier === 'SSS') return 'final';
  if (tier === 'A' || tier === 'S' || tier === 'SS') return 'major_2';
  if (tier === 'D' || tier === 'C' || tier === 'B') return 'major_1';
  return 'base';
}

export function canMerge(a: { definitionId: string; tier: Tier }, b: { definitionId: string; tier: Tier }): boolean {
  return a.definitionId === b.definitionId && a.tier === b.tier && nextTier(a.tier) !== null;
}

// ==========================================
// 2. PROGRESSION COST & RELEASE ECONOMY
// ==========================================

export const F_EQUIVALENT_SPAWN_COST: Record<Tier, number> = {
  F: 1,
  E: 2,
  D: 4,
  C: 8,
  B: 16,
  A: 32,
  S: 64,
  SS: 128,
  SSS: 256,
  X: 512,
};

export function getFEquivalentSpawnCost(tier: Tier): number {
  return F_EQUIVALENT_SPAWN_COST[tier];
}

/**
 * Release refunds 50% of F-equivalent Spawn cost, rounded down.
 * F -> 0, E -> 1, D -> 2, C -> 4, B -> 8, A -> 16, S -> 32, SS -> 64, SSS -> 128, X -> 256
 */
export function getReleaseRefund(tier: Tier): number {
  return Math.floor(getFEquivalentSpawnCost(tier) / 2);
}

// ==========================================
// 3. POWER LEVEL RESOLVER
// ==========================================

export const POWER_LEVEL_RESOLVER_VERSION = 'power-v1';

export function resolveSummonPowerLevel(summon: SummonDefinition, tier: Tier): number {
  const stats = resolveTierStats(summon.stats, tier);
  const critMod = 1 + (summon.stats.critChance ?? 0.05) * ((summon.stats.critDamage ?? 1.5) - 1);
  const power = (stats.hp * 0.15 + stats.atk * 1.8 + stats.def * 1.3 + stats.attacksPerSecond * 40) * critMod;
  return Math.round(power);
}

export function resolveFormationPowerLevel(
  summons: readonly { definition: SummonDefinition; tier: Tier }[],
  alliances?: readonly AllianceDefinition[]
): number {
  const basePower = summons.reduce((sum, item) => sum + resolveSummonPowerLevel(item.definition, item.tier), 0);
  if (!alliances || alliances.length === 0) return basePower;

  const synergies = resolveAllianceSynergies(
    summons.map((s) => s.definition),
    alliances
  );

  let synergyBonusPct = 0;
  for (const entry of synergies.entries) {
    if (entry.activeThreshold) {
      synergyBonusPct += entry.activeThreshold.count * 0.03; // +3% per active threshold count
    }
  }

  return Math.round(basePower * (1 + synergyBonusPct));
}

export function resolveAccountPowerLevel(
  campSummons: readonly { definition: SummonDefinition; tier: Tier }[],
  alliances?: readonly AllianceDefinition[]
): number {
  const sorted = [...campSummons].sort(
    (a, b) => resolveSummonPowerLevel(b.definition, b.tier) - resolveSummonPowerLevel(a.definition, a.tier)
  );
  const top6 = sorted.slice(0, 6);
  return resolveFormationPowerLevel(top6, alliances);
}

// ==========================================
// 4. ALLIANCES & FORMATION SYNERGY
// ==========================================

export type ResolvedAllianceSynergy = {
  id: string;
  name: string;
  count: number;
  activeThreshold: { count: number; effect: string; mechanics: SynergyEffect[] } | null;
  nextThreshold: { count: number; effect: string } | null;
};

export type SummonAllianceModifiers = {
  maxHpPct: number;
  attackSpeedPct: number;
  skillPowerPct: number;
  basicAttackDamagePct: number;
  statusDurationPct: number;
  durabilityPct: number;
  atkPct: number;
  defPct: number;
  critChancePct: number;
  critDamagePct: number;
  blockPct: number;
  dodgePct: number;
  drainPct: number;
  cooldownReductionPct: number;
};

export type FormationAllianceSynergies = {
  entries: ResolvedAllianceSynergy[];
  byDefinitionId: Record<string, SummonAllianceModifiers>;
};

const emptyAllianceModifiers = (): SummonAllianceModifiers => ({
  maxHpPct: 0,
  attackSpeedPct: 0,
  skillPowerPct: 0,
  basicAttackDamagePct: 0,
  statusDurationPct: 0,
  durabilityPct: 0,
  atkPct: 0,
  defPct: 0,
  critChancePct: 0,
  critDamagePct: 0,
  blockPct: 0,
  dodgePct: 0,
  drainPct: 0,
  cooldownReductionPct: 0,
});

const allianceModifierKey: Record<SynergyEffect['stat'], keyof SummonAllianceModifiers> = {
  max_hp_pct: 'maxHpPct',
  attack_speed_pct: 'attackSpeedPct',
  skill_power_pct: 'skillPowerPct',
  basic_attack_damage_pct: 'basicAttackDamagePct',
  status_duration_pct: 'statusDurationPct',
  durability_pct: 'durabilityPct',
  atk_pct: 'atkPct',
  def_pct: 'defPct',
  crit_chance_pct: 'critChancePct',
  crit_damage_pct: 'critDamagePct',
  block_pct: 'blockPct',
  dodge_pct: 'dodgePct',
  drain_pct: 'drainPct',
  cooldown_reduction_pct: 'cooldownReductionPct',
};

export function resolveAllianceSynergies(
  summons: readonly SummonDefinition[],
  alliances: readonly AllianceDefinition[]
): FormationAllianceSynergies {
  const entries: ResolvedAllianceSynergy[] = alliances.map((alliance) => {
    const count = summons.filter((s) => s.allianceId === alliance.id).length;
    const thresholds = [...alliance.thresholds].sort((a, b) => a.count - b.count);
    const activeThreshold = thresholds.filter((t) => t.count <= count).at(-1) ?? null;
    const nextThreshold = thresholds.find((t) => t.count > count) ?? null;
    return {
      id: alliance.id,
      name: alliance.name,
      count,
      activeThreshold,
      nextThreshold,
    };
  });

  const byDefinitionId: Record<string, SummonAllianceModifiers> = {};
  for (const summon of summons) {
    const modifiers = emptyAllianceModifiers();
    for (const entry of entries) {
      if (summon.allianceId === entry.id && entry.activeThreshold) {
        for (const effect of entry.activeThreshold.mechanics) {
          const key = allianceModifierKey[effect.stat];
          if (key) modifiers[key] += effect.value;
        }
      }
    }
    byDefinitionId[summon.id] = modifiers;
  }

  return { entries, byDefinitionId };
}

// Compatibility wrapper for legacy code during migration
export function resolveFormationSynergies(
  summons: readonly SummonDefinition[],
  _origins?: readonly OriginDefinition[],
  _combatFunctions?: readonly CombatFunctionDefinition[]
) {
  const mockAlliances: AllianceDefinition[] = [
    {
      id: 'ascendant',
      name: 'Ascendant',
      description: '',
      thresholds: [
        { count: 2, effect: '+8% attack speed', mechanics: [{ stat: 'attack_speed_pct', value: 0.08 }] },
        { count: 4, effect: '+16% attack speed', mechanics: [{ stat: 'attack_speed_pct', value: 0.16 }] },
        { count: 6, effect: '+25% attack speed', mechanics: [{ stat: 'attack_speed_pct', value: 0.25 }] },
      ],
    },
    {
      id: 'rebel',
      name: 'Rebel',
      description: '',
      thresholds: [
        { count: 2, effect: '+8% max HP', mechanics: [{ stat: 'max_hp_pct', value: 0.08 }] },
        { count: 4, effect: '+16% max HP', mechanics: [{ stat: 'max_hp_pct', value: 0.16 }] },
        { count: 6, effect: '+25% max HP', mechanics: [{ stat: 'max_hp_pct', value: 0.25 }] },
      ],
    },
    {
      id: 'mastermind',
      name: 'Mastermind',
      description: '',
      thresholds: [
        { count: 2, effect: '+8% skill power', mechanics: [{ stat: 'skill_power_pct', value: 0.08 }] },
        { count: 4, effect: '+16% skill power', mechanics: [{ stat: 'skill_power_pct', value: 0.16 }] },
        { count: 6, effect: '+25% skill power', mechanics: [{ stat: 'skill_power_pct', value: 0.25 }] },
      ],
    },
  ];
  return resolveAllianceSynergies(summons, mockAlliances);
}

// ==========================================
// 5. BATTLE CAMP & SHIELDS
// ==========================================

export const CAMP_SIZE = 6;
export const CAMP_CAPACITY = CAMP_SIZE * CAMP_SIZE; // 36
export const MAX_CAMP_CAPACITY = CAMP_CAPACITY;
export const ILLUMINATI_DEFAULT_SLOTS = 6;
export const ILLUMINATI_UPGRADED_SLOTS = 12;
export const MAX_TIME_SHIELD_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export function isCampCell(cell: { x: number; y: number }): cell is CampCell {
  return Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.x < CAMP_SIZE && cell.y >= 0 && cell.y < CAMP_SIZE;
}

export function isIlluminatiCell(cell: CampCell, upgraded: boolean = false): boolean {
  return upgraded ? cell.y <= 1 : cell.y === 0;
}

export function canBeStolen(cell: CampCell, upgraded: boolean = false): boolean {
  return !isIlluminatiCell(cell, upgraded);
}

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

export function countCampOccupancy(placements: readonly CampPlacement[]): number {
  return placements.length;
}

export function countIlluminatiOccupancy(placements: readonly CampPlacement[], upgraded: boolean = false): number {
  return placements.filter((placement) => isIlluminatiCell(placement.cell, upgraded)).length;
}

export function isIlluminatiFull(placements: readonly CampPlacement[], upgraded: boolean = false): boolean {
  const cap = upgraded ? ILLUMINATI_UPGRADED_SLOTS : ILLUMINATI_DEFAULT_SLOTS;
  return countIlluminatiOccupancy(placements, upgraded) >= cap;
}

export function findFirstExposedCampCell(placements: readonly CampPlacement[], upgraded: boolean = false): CampCell | null {
  const startY = upgraded ? 2 : 1;
  for (let y = startY; y < CAMP_SIZE; y += 1) {
    for (let x = 0; x < CAMP_SIZE; x += 1) {
      if (!isCampCellOccupied({ x, y }, placements)) return { x, y };
    }
  }
  return null;
}

// ==========================================
// 6. DEALER ECONOMY RULES
// ==========================================

export const DEALER_EPOCH_HOURS = 2;
export const DEALER_EPOCH_MS = DEALER_EPOCH_HOURS * 60 * 60 * 1000;
export const DEALER_CYCLE_HOURS = 24;
export const DEALER_EPOCHS_PER_CYCLE = 12;
export const DEALER_STOCK_CAP = 100;

// Deterministic 12-epoch distribution totaling exactly 100 medals per 24 hours: [8, 9, 8, 9, 8, 9, 8, 9, 8, 9, 8, 9] (sum = 102 - 2 = 100) -> 8 * 8 + 4 * 9 = 64 + 36 = 100
export const DEALER_EPOCH_SCHEDULE = [8, 9, 8, 9, 8, 9, 8, 9, 8, 8, 9, 8]; // Sum = 100

export function getDealerEpochAccrual(epochIndex: number): number {
  const idx = ((epochIndex % DEALER_EPOCHS_PER_CYCLE) + DEALER_EPOCHS_PER_CYCLE) % DEALER_EPOCHS_PER_CYCLE;
  return DEALER_EPOCH_SCHEDULE[idx]!;
}

export function calculateDealerAccrual(
  lastAccrualTimestamp: number,
  nowTimestamp: number,
  currentStock: number
): {
  newStock: number;
  accrued: number;
  epochsElapsed: number;
  nextEpochRemainingMs: number;
} {
  const elapsedMs = Math.max(0, nowTimestamp - lastAccrualTimestamp);
  const epochsElapsed = Math.floor(elapsedMs / DEALER_EPOCH_MS);
  const nextEpochRemainingMs = DEALER_EPOCH_MS - (elapsedMs % DEALER_EPOCH_MS);

  let accrued = 0;
  for (let i = 0; i < epochsElapsed; i++) {
    accrued += getDealerEpochAccrual(i);
  }

  const newStock = Math.min(DEALER_STOCK_CAP, currentStock + accrued);
  return {
    newStock,
    accrued: newStock - currentStock,
    epochsElapsed,
    nextEpochRemainingMs,
  };
}

export function canClaimDealerStock(playerMedalBalance: number): boolean {
  return playerMedalBalance < 100;
}

export function claimDealerStock(
  playerMedalBalance: number,
  currentDealerStock: number
): {
  newPlayerWallet: number;
  newDealerStock: number;
  claimedAmount: number;
} {
  if (!canClaimDealerStock(playerMedalBalance) || currentDealerStock <= 0) {
    return {
      newPlayerWallet: playerMedalBalance,
      newDealerStock: currentDealerStock,
      claimedAmount: 0,
    };
  }

  const claimedAmount = currentDealerStock;
  return {
    newPlayerWallet: playerMedalBalance + claimedAmount,
    newDealerStock: 0,
    claimedAmount,
  };
}

// ==========================================
// 7. DEFENSE & TIME SHIELD CONCURRENCY
// ==========================================

export function canEditDefense(isTimeShieldActive: boolean, hasActiveRaidLock: boolean): boolean {
  return isTimeShieldActive && !hasActiveRaidLock;
}

// ==========================================
// 8. BATTLEFIELD & RAID FORMATIONS
// ==========================================

export const BATTLEFIELD_SIZE = 8;
export const PLAYER_DEPLOYMENT_MIN_Z = 4;
export const MAX_PLAYER_DEPLOYED_SUMMONS = 6;

export function isBattleCell(cell: { x: number; z: number }): cell is BattleCell {
  return Number.isInteger(cell.x) && Number.isInteger(cell.z) && cell.x >= 0 && cell.x < BATTLEFIELD_SIZE && cell.z >= 0 && cell.z < BATTLEFIELD_SIZE;
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
  placements: readonly BattlefieldPlacement[]
): boolean {
  if (!isPlayerDeploymentCell(cell)) return false;

  const currentPlacement = placements.find((placement) => placement.summonInstanceId === summonInstanceId);
  const occupiedByAnotherSummon = placements.some(
    (placement) => placement.summonInstanceId !== summonInstanceId && placement.cell.x === cell.x && placement.cell.z === cell.z
  );
  if (occupiedByAnotherSummon) return false;

  return currentPlacement !== undefined || placements.length < MAX_PLAYER_DEPLOYED_SUMMONS;
}

export function recallBattlefieldPlacement(
  summonInstanceId: string,
  placements: readonly BattlefieldPlacement[]
): BattlefieldPlacement[] {
  return placements.filter((placement) => placement.summonInstanceId !== summonInstanceId);
}

export const RAID_ROUND_DEFINITIONS: readonly RaidRoundDefinition[] = [
  { id: 'round1', number: 1, slotCount: 2, setupTimeoutSeconds: 10 },
  { id: 'round2', number: 2, slotCount: 4, setupTimeoutSeconds: 20 },
  { id: 'round3', number: 3, slotCount: 6, setupTimeoutSeconds: 30 },
] as const;

export function getRaidRoundDefinition(id: RaidRoundId): RaidRoundDefinition {
  return RAID_ROUND_DEFINITIONS.find((round) => round.id === id)!;
}

export function createEmptyRaidSquadDraft(): RaidSquadDraft {
  return { round1: [null, null], round2: [null, null, null, null], round3: [null, null, null, null, null, null] };
}

function cloneRaidDraft(draft: RaidSquadDraft): RaidSquadDraft {
  return { round1: [...draft.round1], round2: [...draft.round2], round3: [...draft.round3] };
}

export function isRaidRoundComplete(draft: RaidSquadDraft, roundId: RaidRoundId): boolean {
  return draft[roundId].every((id): id is string => id !== null) && new Set(draft[roundId]).size === draft[roundId].length;
}

export function isRaidDraftComplete(draft: RaidSquadDraft): boolean {
  return RAID_ROUND_DEFINITIONS.every((round) => isRaidRoundComplete(draft, round.id));
}

export function sanitizeRaidDraft(value: unknown, inventory: readonly SummonInstance[]): { draft: RaidSquadDraft; error: string | null } {
  const parsed = RaidSquadDraftSchema.safeParse(value);
  if (!parsed.success) return { draft: createEmptyRaidSquadDraft(), error: 'Raid squad draft was invalid and was reset.' };
  const owned = new Set(inventory.map((instance) => instance.id));
  const draft = cloneRaidDraft(parsed.data);
  let stale = false;
  for (const round of RAID_ROUND_DEFINITIONS) {
    for (let index = 0; index < draft[round.id].length; index += 1) {
      const id = draft[round.id][index];
      if (id && !owned.has(id)) {
        draft[round.id][index] = null;
        stale = true;
      }
    }
  }
  return { draft, error: stale ? 'Unavailable Summons were removed from the raid draft.' : null };
}

export type RaidDraftMutation = { draft: RaidSquadDraft; error: string | null };

export function selectRaidSummon(
  draft: RaidSquadDraft,
  roundId: RaidRoundId,
  instanceId: string,
  inventory: readonly SummonInstance[]
): RaidDraftMutation {
  if (!inventory.some((instance) => instance.id === instanceId)) return { draft, error: 'That Summon is no longer owned.' };
  const slots = draft[roundId];
  if (slots.includes(instanceId)) return { draft, error: 'This Summon already occupies a slot in this round.' };
  const emptyIndex = slots.findIndex((id) => id === null);
  if (emptyIndex < 0) return { draft, error: 'Round full — remove a Summon first.' };
  const next = cloneRaidDraft(draft);
  next[roundId][emptyIndex] = instanceId;
  return { draft: next, error: null };
}

export function removeRaidSummon(draft: RaidSquadDraft, roundId: RaidRoundId, slotIndex: number): RaidDraftMutation {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= draft[roundId].length) return { draft, error: 'That raid slot is unavailable.' };
  const next = cloneRaidDraft(draft);
  next[roundId][slotIndex] = null;
  return { draft: next, error: null };
}

export function finalizeRaidRoundDraft(
  draftValue: unknown,
  inventory: readonly SummonInstance[],
  roundId: RaidRoundId
): { ok: true; squad: RaidSummonSnapshot[] } | { ok: false; error: string } {
  const parsed = RaidSquadDraftSchema.safeParse(draftValue);
  if (!parsed.success) return { ok: false, error: 'Raid formation is malformed.' };
  const slots = parsed.data[roundId];
  if (!slots.every((id): id is string => id !== null) || new Set(slots).size !== slots.length) {
    return { ok: false, error: `Deploy ${getRaidRoundDefinition(roundId).slotCount} unique Summons for this round.` };
  }
  const byId = new Map(inventory.map((instance) => [instance.id, instance]));
  const squad = slots.map((id) => {
    const instance = byId.get(id!);
    return instance ? { instanceId: instance.id, definitionId: instance.definitionId, tier: instance.tier } : null;
  });
  return squad.some((item) => item === null)
    ? { ok: false, error: 'A selected Summon is no longer owned.' }
    : { ok: true, squad: squad as RaidSummonSnapshot[] };
}

export function finalizeRaidSquadDraft(
  draftValue: unknown,
  inventory: readonly SummonInstance[],
  clientActionId: string,
  contentVersion: string
): { ok: true; snapshot: RaidSquadSnapshot } | { ok: false; error: string } {
  const parsed = RaidSquadDraftSchema.safeParse(draftValue);
  if (!parsed.success) return { ok: false, error: 'Raid squad draft is malformed.' };
  const draft = parsed.data;
  if (!isRaidDraftComplete(draft)) return { ok: false, error: 'Complete every raid round before starting.' };
  const byId = new Map(inventory.map((instance) => [instance.id, instance]));
  const resolve = (roundId: RaidRoundId) =>
    draft[roundId].map((instanceId) => {
      const instance = instanceId && byId.get(instanceId);
      return instance ? { instanceId: instance.id, definitionId: instance.definitionId, tier: instance.tier } : null;
    });
  const candidate = { clientActionId, contentVersion, round1: resolve('round1'), round2: resolve('round2'), round3: resolve('round3') };
  if (candidate.round1.some((item) => item === null) || candidate.round2.some((item) => item === null) || candidate.round3.some((item) => item === null)) {
    return { ok: false, error: 'A selected Summon is no longer owned.' };
  }
  const snapshot = RaidSquadSnapshotSchema.safeParse(candidate);
  return snapshot.success ? { ok: true, snapshot: JSON.parse(JSON.stringify(snapshot.data)) as RaidSquadSnapshot } : { ok: false, error: 'Raid squad is invalid.' };
}

export function validateDefenseSnapshot(
  value: unknown,
  inventory: readonly SummonInstance[]
): { ok: true; snapshot: DefenseSnapshot } | { ok: false; error: string } {
  const parsed = DefenseSnapshotSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: 'Defense must contain complete 2/4/6 fields.' };
  const owned = new Set(inventory.map((summon) => summon.id));
  for (const field of parsed.data.fields) {
    const ids = field.placements.map((entry) => entry.summon.instanceId);
    const cells = field.placements.map((entry) => `${entry.cell.x}:${entry.cell.z}`);
    if (new Set(ids).size !== ids.length) return { ok: false, error: 'A Summon can appear only once per defense field.' };
    if (new Set(cells).size !== cells.length) return { ok: false, error: 'Defense field cells must be unique.' };
    if (field.placements.some((entry) => !owned.has(entry.summon.instanceId))) return { ok: false, error: 'Defense contains a Summon you no longer own.' };
  }
  return { ok: true, snapshot: parsed.data };
}

// ==========================================
// 9. RAID SURRENDER & STEAL RESOLVERS
// ==========================================

export function resolveSurrenderCandidates(deployedSummons: readonly RaidSummonSnapshot[]): RaidSummonSnapshot[] {
  const uniqueMap = new Map<string, RaidSummonSnapshot>();
  for (const summon of deployedSummons) {
    if (!uniqueMap.has(summon.instanceId)) {
      uniqueMap.set(summon.instanceId, summon);
    }
  }
  return Array.from(uniqueMap.values());
}

export function selectWeakestSurrenderedSummon(
  candidates: readonly RaidSummonSnapshot[],
  summonDefinitions: readonly SummonDefinition[]
): RaidSummonSnapshot {
  if (candidates.length === 0) throw new Error('No surrender candidates available');
  const defMap = new Map(summonDefinitions.map((d) => [d.id, d]));

  return [...candidates].sort((a, b) => {
    const defA = defMap.get(a.definitionId);
    const defB = defMap.get(b.definitionId);
    const powerA = defA ? resolveSummonPowerLevel(defA, a.tier) : 0;
    const powerB = defB ? resolveSummonPowerLevel(defB, b.tier) : 0;
    return powerA - powerB || a.instanceId.localeCompare(b.instanceId);
  })[0]!;
}
