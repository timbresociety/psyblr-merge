import { z } from 'zod';

export const TierSchema = z.enum(['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X']);
export type Tier = z.infer<typeof TierSchema>;

export const SynergyEffectSchema = z.object({
  stat: z.enum([
    'attack_speed_pct',
    'max_hp_pct',
    'skill_power_pct',
    'basic_attack_damage_pct',
    'status_duration_pct',
    'durability_pct',
    'atk_pct',
    'def_pct',
    'crit_chance_pct',
    'crit_damage_pct',
    'block_pct',
    'dodge_pct',
    'drain_pct',
    'cooldown_reduction_pct',
  ]),
  value: z.number().nonnegative(),
});
export type SynergyEffect = z.infer<typeof SynergyEffectSchema>;

export const AllianceThresholdSchema = z.object({
  count: z.union([z.literal(2), z.literal(4), z.literal(6)]),
  effect: z.string().min(1),
  mechanics: z.array(SynergyEffectSchema).default([]),
});
export type AllianceThreshold = z.infer<typeof AllianceThresholdSchema>;

export const AllianceDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  thresholds: z.array(AllianceThresholdSchema),
});
export type AllianceDefinition = z.infer<typeof AllianceDefinitionSchema>;

// Compatibility aliases during migration
export const OriginDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  thresholds: z.array(
    z.object({
      count: z.number().int().positive(),
      effect: z.string().min(1),
      mechanics: z.array(SynergyEffectSchema).default([]),
    })
  ),
});
export type OriginDefinition = z.infer<typeof OriginDefinitionSchema>;

export const CombatFunctionDefinitionSchema = OriginDefinitionSchema;
export type CombatFunctionDefinition = OriginDefinition;

export const SkillMechanicsSchema = z.object({
  kind: z.enum(['line_damage', 'aoe_slow', 'dash_aoe', 'taunt_shield', 'mark_vulnerability', 'stun', 'buff', 'heal', 'passive_stat']),
  cooldownMs: z.number().positive(),
  initialDelayMs: z.number().nonnegative(),
  damageMultiplier: z.number().nonnegative().optional(),
  radius: z.number().positive().optional(),
  durationMs: z.number().positive().optional(),
  slowPercent: z.number().min(0).max(100).optional(),
  shieldMultiplier: z.number().nonnegative().optional(),
  vulnerabilityPercent: z.number().min(0).optional(),
  dashDistance: z.number().positive().optional(),
  lineWidth: z.number().positive().optional(),
  presentationKey: z.string().min(1),
});
export type SkillMechanics = z.infer<typeof SkillMechanicsSchema>;

export const SkillDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['basic', 'active', 'ultimate', 'passive']),
  summary: z.string().min(1),
  description: z.string().optional(),
  mechanics: SkillMechanicsSchema.optional(),
});
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

export const SummonStatsSchema = z.object({
  hp: z.number().positive(),
  atk: z.number().positive(),
  def: z.number().nonnegative(),
  attacksPerSecond: z.number().positive(),
  range: z.number().positive(),
  moveSpeed: z.number().positive(),
  critChance: z.number().min(0).max(1).optional().default(0.05),
  critDamage: z.number().min(1).optional().default(1.5),
  blockChance: z.number().min(0).max(1).optional().default(0),
  dodgeChance: z.number().min(0).max(1).optional().default(0),
  skillPower: z.number().min(0).optional().default(100),
  cooldownReduction: z.number().min(0).max(0.8).optional().default(0),
  healingPower: z.number().min(0).optional().default(100),
  drain: z.number().min(0).optional().default(0),
});
export type SummonStats = z.infer<typeof SummonStatsSchema>;

export const SummonDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1).default(''),
  summary: z.string().optional(),
  quote: z.string().default(''),
  allianceId: z.string().min(1).default('ascendant'),
  originId: z.string().optional(),
  combatFunctionId: z.string().optional(),
  passiveId: z.string().optional(),
  stats: SummonStatsSchema,
  skills: z.object({
    basic: z.string(),
    skill1: z.string(),
    skill2: z.string().nullable().optional().default(null),
    ultimate: z.string().nullable().optional().default(null),
  }),
  formsByTier: z.record(z.string(), z.string()).optional(),
  assetManifest: z.string(),
  portraitUrl: z.string().min(1).optional(),
});
export type SummonDefinition = z.infer<typeof SummonDefinitionSchema>;

export const SummonInstanceSchema = z.object({
  id: z.string().min(1),
  definitionId: z.string().min(1),
  tier: TierSchema,
});
export type SummonInstance = z.infer<typeof SummonInstanceSchema>;

export const BattleCellSchema = z.object({
  x: z.number().int().min(0).max(7),
  z: z.number().int().min(0).max(7),
});
export type BattleCell = z.infer<typeof BattleCellSchema>;

export const BattlefieldPlacementSchema = z.object({
  summonInstanceId: z.string().min(1),
  cell: BattleCellSchema,
});
export type BattlefieldPlacement = z.infer<typeof BattlefieldPlacementSchema>;

export const CampCellSchema = z.object({
  x: z.number().int().min(0).max(5),
  y: z.number().int().min(0).max(5),
});
export type CampCell = z.infer<typeof CampCellSchema>;

export const CampPlacementSchema = z.object({
  summonInstanceId: z.string().min(1),
  cell: CampCellSchema,
});
export type CampPlacement = z.infer<typeof CampPlacementSchema>;

export const MergeSummonsRequestSchema = z.object({
  clientActionId: z.string().min(1),
  sourceSummonInstanceId: z.string().min(1),
  targetSummonInstanceId: z.string().min(1),
});
export type MergeSummonsRequest = z.infer<typeof MergeSummonsRequestSchema>;

export const MergeReplayDescriptorSchema = z.object({
  replayId: z.string().min(1),
  presentationSeed: z.string().min(1),
  effect: z.literal('merge_pulse'),
});
export type MergeReplayDescriptor = z.infer<typeof MergeReplayDescriptorSchema>;

export const MergeSummonsResultSchema = z.object({
  clientActionId: z.string().min(1),
  consumedSourceInstanceId: z.string().min(1),
  upgradedTarget: SummonInstanceSchema,
  previousTier: TierSchema,
  nextTier: TierSchema,
  targetPlacement: CampPlacementSchema,
  replay: MergeReplayDescriptorSchema,
});
export type MergeSummonsResult = z.infer<typeof MergeSummonsResultSchema>;

export const MergeRuntimeSnapshotSchema = z.object({
  appliedActionIds: z.array(z.string().min(1)),
});
export type MergeRuntimeSnapshot = z.infer<typeof MergeRuntimeSnapshotSchema>;

// Release Economy Contracts
export const ReleaseSummonRequestSchema = z.object({
  clientActionId: z.string().min(1),
  summonInstanceId: z.string().min(1),
});
export type ReleaseSummonRequest = z.infer<typeof ReleaseSummonRequestSchema>;

export const ReleaseSummonResultSchema = z.object({
  clientActionId: z.string().min(1),
  releasedSummonInstanceId: z.string().min(1),
  tier: TierSchema,
  medalsRefunded: z.number().int().nonnegative(),
  newMedalBalance: z.number().int().nonnegative(),
  freedCell: CampCellSchema,
});
export type ReleaseSummonResult = z.infer<typeof ReleaseSummonResultSchema>;

// Spawn Machine & Economy Contracts
export const SpawnBlobTargetSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});
export type SpawnBlobTarget = z.infer<typeof SpawnBlobTargetSchema>;

export const SpawnMachineDefinitionSchema = z.object({
  dailyMedalBudget: z.number().int().positive().default(100),
  dailyBallCap: z.number().int().positive().optional(),
  binProbabilities: z
    .array(z.number().positive())
    .length(6)
    .refine((values) => values.reduce((sum, value) => sum + value, 0) === 100, 'Bin probabilities must total 100'),
  blobTargets: z
    .array(SpawnBlobTargetSchema)
    .refine((targets) => new Set(targets.map((target) => target.id)).size === targets.length, 'Blob ids must be unique'),
  tutorial: z.object({
    targetCampOccupancy: z.number().int().min(1).max(36),
    guaranteeCopiesOfPrimary: z.number().int().positive(),
  }).refine((tutorial) => tutorial.guaranteeCopiesOfPrimary <= tutorial.targetCampOccupancy - 6, 'Guaranteed copies must fit tutorial slots'),
});
export type SpawnMachineDefinition = z.infer<typeof SpawnMachineDefinitionSchema>;

export const SpawnDailyPoolSlotSchema = z.object({
  slotIndex: z.number().int().min(0).max(5),
  summonDefinitionId: z.string().min(1),
  probability: z.number().positive(),
  tier: TierSchema.default('F'),
});
export type SpawnDailyPoolSlot = z.infer<typeof SpawnDailyPoolSlotSchema>;

export const SpawnRuntimeSnapshotSchema = z.object({
  medals: z.number().int().min(0),
  balls: z.number().int().min(0).optional(),
  ballCapacity: z.number().int().positive().optional(),
  dailyPool: z.array(SpawnDailyPoolSlotSchema).length(6),
  blobProgress: z.record(z.string(), z.number().int().nonnegative()),
  tutorialDropIndex: z.number().int().nonnegative(),
  appliedActionIds: z.array(z.string().min(1)),
});
export type SpawnRuntimeSnapshot = z.infer<typeof SpawnRuntimeSnapshotSchema>;

export const ReleaseBallRequestSchema = z.object({
  clientActionId: z.string().min(1),
});
export type ReleaseBallRequest = z.infer<typeof ReleaseBallRequestSchema>;

export const SpawnSummonRequestSchema = ReleaseBallRequestSchema;
export type SpawnSummonRequest = ReleaseBallRequest;

export const SpawnReplayDescriptorSchema = z.object({
  replayId: z.string().min(1),
  rewardSlot: z.number().int().min(0).max(5),
  presentationSeed: z.string().min(1),
});
export type SpawnReplayDescriptor = z.infer<typeof SpawnReplayDescriptorSchema>;

export const ReleaseBallResultSchema = z.object({
  clientActionId: z.string().min(1),
  rewardSlot: z.number().int().min(0).max(5),
  createdSummon: SummonInstanceSchema,
  destination: CampPlacementSchema,
  medalsRemaining: z.number().int().nonnegative().optional(),
  ballsRemaining: z.number().int().nonnegative().optional(),
  blobProgress: z.record(z.string(), z.number().int().nonnegative()),
  replay: SpawnReplayDescriptorSchema,
});
export type ReleaseBallResult = z.infer<typeof ReleaseBallResultSchema>;

export const SpawnSummonResultSchema = ReleaseBallResultSchema;
export type SpawnSummonResult = ReleaseBallResult;

// Dealer Contracts
export const DealerStateSchema = z.object({
  generatedStock: z.number().int().min(0).max(100),
  stockCap: z.number().int().default(100),
  lastAccrualTimestamp: z.number().int().nonnegative(),
  nextEpochMs: z.number().int().nonnegative(),
  canCollect: z.boolean(),
});
export type DealerState = z.infer<typeof DealerStateSchema>;

export const CollectDealerStockRequestSchema = z.object({
  clientActionId: z.string().min(1),
});
export type CollectDealerStockRequest = z.infer<typeof CollectDealerStockRequestSchema>;

export const CollectDealerStockResultSchema = z.object({
  clientActionId: z.string().min(1),
  collectedStock: z.number().int().nonnegative(),
  newMedalBalance: z.number().int().nonnegative(),
  newDealerStock: z.number().int().min(0),
});
export type CollectDealerStockResult = z.infer<typeof CollectDealerStockResultSchema>;

export const BaseBuildingSocketSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['battle_camp', 'spawn_machine', 'raid_gate', 'future', 'dealer', 'defense_podium', 'campaign_gate']),
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotationY: z.number(),
  footprint: z.tuple([z.number().positive(), z.number().positive()]),
});
export type BaseBuildingSocket = z.infer<typeof BaseBuildingSocketSchema>;

export const BaseLayoutDefinitionSchema = z.object({
  version: z.literal(1),
  camp: z.object({
    origin: z.tuple([z.number(), z.number(), z.number()]),
    cellSize: z.number().positive(),
  }),
  buildingSockets: z.array(BaseBuildingSocketSchema),
});
export type BaseLayoutDefinition = z.infer<typeof BaseLayoutDefinitionSchema>;

export const RaidRoundIdSchema = z.enum(['round1', 'round2', 'round3']);
export type RaidRoundId = z.infer<typeof RaidRoundIdSchema>;

export const RaidRoundDefinitionSchema = z.object({
  id: RaidRoundIdSchema,
  number: z.number().int().min(1).max(3),
  slotCount: z.union([z.literal(2), z.literal(4), z.literal(6)]),
  setupTimeoutSeconds: z.union([z.literal(10), z.literal(20), z.literal(30)]).default(10),
});
export type RaidRoundDefinition = z.infer<typeof RaidRoundDefinitionSchema>;

export const RaidSquadDraftSchema = z.object({
  round1: z.array(z.string().min(1).nullable()).length(2),
  round2: z.array(z.string().min(1).nullable()).length(4),
  round3: z.array(z.string().min(1).nullable()).length(6),
});
export type RaidSquadDraft = z.infer<typeof RaidSquadDraftSchema>;

export const RaidSquadSchema = z.object({
  round1: z.array(z.string().min(1)).length(2).refine((v) => new Set(v).size === 2, 'Round 1 summons must be unique'),
  round2: z.array(z.string().min(1)).length(4).refine((v) => new Set(v).size === 4, 'Round 2 summons must be unique'),
  round3: z.array(z.string().min(1)).length(6).refine((v) => new Set(v).size === 6, 'Round 3 summons must be unique'),
});
export type RaidSquad = z.infer<typeof RaidSquadSchema>;

export const RaidSummonSnapshotSchema = z.object({
  instanceId: z.string().min(1),
  definitionId: z.string().min(1),
  tier: TierSchema,
});
export type RaidSummonSnapshot = z.infer<typeof RaidSummonSnapshotSchema>;

export const RaidFormationPlacementSchema = z.object({
  summon: RaidSummonSnapshotSchema,
  cell: BattleCellSchema.refine((cell) => cell.z >= 4, 'Raid attacker cells must be on the player half'),
});
export type RaidFormationPlacement = z.infer<typeof RaidFormationPlacementSchema>;

export const RaidSquadSnapshotSchema = z.object({
  clientActionId: z.string().min(1),
  contentVersion: z.string().min(1),
  round1: z.array(RaidSummonSnapshotSchema).length(2).refine((v) => new Set(v.map((s) => s.instanceId)).size === 2, 'Round 1 summons must be unique'),
  round2: z.array(RaidSummonSnapshotSchema).length(4).refine((v) => new Set(v.map((s) => s.instanceId)).size === 4, 'Round 2 summons must be unique'),
  round3: z.array(RaidSummonSnapshotSchema).length(6).refine((v) => new Set(v.map((s) => s.instanceId)).size === 6, 'Round 3 summons must be unique'),
});
export type RaidSquadSnapshot = z.infer<typeof RaidSquadSnapshotSchema>;

export const TutorialActionSchema = z.enum([
  'OPEN_INVENTORY',
  'SELECT_SUMMON',
  'VIEW_STATS',
  'VIEW_SKILLS',
  'PLACE_SUMMON',
  'REPOSITION_SUMMON',
  'RECALL_SUMMON',
  'INSPECT_SUMMON',
  'VIEW_SYNERGIES',
  'START_BATTLE',
  'CAST_SKILL_1',
  'TOGGLE_AUTO_CAST',
  'TUTORIAL_CONTINUE',
  'SELECT_CAMP_SUMMON',
  'MOVE_CAMP_SUMMON',
  'OPEN_SPAWN_MACHINE',
  'DROP_BALL',
  'SPAWN_SUMMON',
  'LONG_PRESS_DROP',
  'MERGE_SUMMONS',
  'VIEW_PROGRESS',
  'OPEN_RAID_GATE',
  'SELECT_RAID_SUMMON',
  'START_RAID',
  'SELECT_STEAL',
  'CONFIRM_STEAL',
  'SELECT_DEFENSE_SUMMON',
  'SAVE_DEFENSE',
]);
export type TutorialAction = z.infer<typeof TutorialActionSchema>;

export const TutorialStepSchema = z.object({
  id: z.string(),
  phase: z.string(),
  scene: z.enum(['campaign', 'base', 'raid', 'opponentCamp', 'defense']),
  cameraPreset: z.string().nullable(),
  title: z.string(),
  body: z.string(),
  highlightTarget: z.string().nullable(),
  allowedActions: z.array(TutorialActionSchema),
  completionEvent: z.string(),
  completionMatch: z.record(z.string(), z.string().or(z.number()).or(z.boolean()).or(z.null())).optional(),
  nextStep: z.string().nullable(),
});
export type TutorialStep = z.infer<typeof TutorialStepSchema>;

export const CombatSideSchema = z.enum(['player', 'enemy']);
export type CombatSide = z.infer<typeof CombatSideSchema>;

export const CombatUnitSnapshotSchema = z.object({
  id: z.string().min(1),
  definitionId: z.string().min(1),
  side: CombatSideSchema,
  spawnCell: BattleCellSchema,
  hp: z.number().positive(),
  atk: z.number().positive(),
  def: z.number().nonnegative(),
  attacksPerSecond: z.number().positive(),
  range: z.number().positive(),
  moveSpeed: z.number().positive(),
  skill1Id: z.string().min(1).nullable(),
  skill1: SkillMechanicsSchema.nullable(),
  basicAttackDamagePct: z.number().nonnegative().default(0),
  skillPowerPct: z.number().nonnegative().default(0),
  statusDurationPct: z.number().nonnegative().default(0),
});
export type CombatUnitSnapshot = z.infer<typeof CombatUnitSnapshotSchema>;

export const CombatSnapshotSchema = z.object({
  battleId: z.string().min(1),
  mode: z.enum(['campaign', 'raid']),
  units: z.array(CombatUnitSnapshotSchema).min(1),
});
export type CombatSnapshot = z.infer<typeof CombatSnapshotSchema>;

export const CombatCommandSchema = z.object({
  type: z.literal('cast_skill_1'),
  actorId: z.string().min(1),
  issuedAtTick: z.number().int().nonnegative(),
});
export type CombatCommand = z.infer<typeof CombatCommandSchema>;

export const CombatEventSchema = z.object({
  tick: z.number().int().nonnegative(),
  type: z.enum([
    'spawn',
    'move',
    'target_changed',
    'basic_attack',
    'skill_ready',
    'skill_cast',
    'damage',
    'status_applied',
    'status_removed',
    'shield_changed',
    'death',
    'combat_phase_changed',
    'battle_end',
  ]),
  actorId: z.string().nullable(),
  targetId: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type CombatEvent = z.infer<typeof CombatEventSchema>;

export const RaidOutcomeSchema = z.enum(['win', 'draw', 'loss']);
export type RaidOutcome = z.infer<typeof RaidOutcomeSchema>;

export const RaidSeedSchema = z.string().min(1).max(128);
export type RaidSeed = z.infer<typeof RaidSeedSchema>;

export const RaidOpponentSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  kind: z.enum(['tutorial', 'player']),
});
export type RaidOpponent = z.infer<typeof RaidOpponentSchema>;

export const RaidCanonicalSquadSchema = z.object({
  contentVersion: z.string().min(1),
  round1: z.array(RaidSummonSnapshotSchema).length(2),
  round2: z.array(RaidSummonSnapshotSchema).length(4),
  round3: z.array(RaidSummonSnapshotSchema).length(6),
});
export type RaidCanonicalSquad = z.infer<typeof RaidCanonicalSquadSchema>;

export const StartRaidRequestSchema = z.object({
  clientActionId: z.string().min(1),
  attacker: RaidSquadSnapshotSchema,
});
export type StartRaidRequest = z.infer<typeof StartRaidRequestSchema>;

export const StartRaidRoundRequestSchema = z.discriminatedUnion('roundId', [
  z.object({
    clientActionId: z.string().min(1),
    raidId: z.string().min(1),
    rootSeed: RaidSeedSchema,
    contentVersion: z.string().min(1),
    roundId: z.literal('round1'),
    attacker: z.array(RaidSummonSnapshotSchema).length(2),
    attackerPlacements: z.array(RaidFormationPlacementSchema).length(2),
  }),
  z.object({
    clientActionId: z.string().min(1),
    raidId: z.string().min(1),
    rootSeed: RaidSeedSchema,
    contentVersion: z.string().min(1),
    roundId: z.literal('round2'),
    attacker: z.array(RaidSummonSnapshotSchema).length(4),
    attackerPlacements: z.array(RaidFormationPlacementSchema).length(4),
  }),
  z.object({
    clientActionId: z.string().min(1),
    raidId: z.string().min(1),
    rootSeed: RaidSeedSchema,
    contentVersion: z.string().min(1),
    roundId: z.literal('round3'),
    attacker: z.array(RaidSummonSnapshotSchema).length(6),
    attackerPlacements: z.array(RaidFormationPlacementSchema).length(6),
  }),
]);
export type StartRaidRoundRequest = z.infer<typeof StartRaidRoundRequestSchema>;

export const RaidRoundResultSchema = z.object({
  roundId: RaidRoundIdSchema,
  roundSize: z.union([z.literal(2), z.literal(4), z.literal(6)]),
  seed: RaidSeedSchema,
  outcome: RaidOutcomeSchema,
  combatSnapshot: CombatSnapshotSchema,
  events: z.array(CombatEventSchema),
});
export type RaidRoundResult = z.infer<typeof RaidRoundResultSchema>;

export const RaidRoundResolutionSchema = z.object({
  raidId: z.string().min(1),
  clientActionId: z.string().min(1),
  contentVersion: z.string().min(1),
  rootSeed: RaidSeedSchema,
  opponent: RaidOpponentSchema,
  attacker: z.array(RaidSummonSnapshotSchema).min(1),
  defender: z.array(RaidSummonSnapshotSchema).min(1),
  attackerPlacements: z.array(RaidFormationPlacementSchema).min(1),
  defenderPlacements: z.array(RaidFormationPlacementSchema).min(1),
  round: RaidRoundResultSchema,
});
export type RaidRoundResolution = z.infer<typeof RaidRoundResolutionSchema>;

export const OpponentCampSummonSchema = z.object({
  summonInstanceId: z.string().min(1),
  definitionId: z.string().min(1),
  tier: TierSchema,
  cell: CampCellSchema,
  protected: z.boolean(),
  selectableForSteal: z.boolean(),
  pendingSteal: z.boolean().default(false),
});
export type OpponentCampSummon = z.infer<typeof OpponentCampSummonSchema>;

export const OpponentCampHandoffSchema = z.object({
  raidId: z.string().min(1),
  opponent: RaidOpponentSchema,
  summons: z.array(OpponentCampSummonSchema),
  claimConsumed: z.boolean().default(false),
});
export type OpponentCampHandoff = z.infer<typeof OpponentCampHandoffSchema>;

export const ClaimRaidStealRequestSchema = z.object({
  clientActionId: z.string().min(1),
  raidId: z.string().min(1),
  targetSummonInstanceId: z.string().min(1),
});
export type ClaimRaidStealRequest = z.infer<typeof ClaimRaidStealRequestSchema>;

export const ClaimRaidStealResultSchema = z.object({
  clientActionId: z.string().min(1),
  raidId: z.string().min(1),
  claimedSummon: SummonInstanceSchema,
  destination: CampPlacementSchema,
  completed: z.literal(true),
});
export type ClaimRaidStealResult = z.infer<typeof ClaimRaidStealResultSchema>;

export const DefenseFieldSchema = z.object({
  roundId: RaidRoundIdSchema,
  placements: z.array(RaidFormationPlacementSchema),
});
export type DefenseField = z.infer<typeof DefenseFieldSchema>;

export const DefenseSnapshotSchema = z.object({
  clientActionId: z.string().min(1),
  contentVersion: z.string().min(1),
  fields: z.tuple([
    z.object({ roundId: z.literal('round1'), placements: z.array(RaidFormationPlacementSchema).length(2) }),
    z.object({ roundId: z.literal('round2'), placements: z.array(RaidFormationPlacementSchema).length(4) }),
    z.object({ roundId: z.literal('round3'), placements: z.array(RaidFormationPlacementSchema).length(6) }),
  ]),
});
export type DefenseSnapshot = z.infer<typeof DefenseSnapshotSchema>;

export const RaidResultSchema = z.object({
  raidId: z.string().min(1),
  clientActionId: z.string().min(1),
  contentVersion: z.string().min(1),
  rootSeed: RaidSeedSchema,
  opponent: RaidOpponentSchema,
  attacker: RaidCanonicalSquadSchema,
  defender: RaidCanonicalSquadSchema,
  rounds: z.array(RaidRoundResultSchema).length(3),
  outcome: RaidOutcomeSchema,
}).superRefine((value, context) => {
  const expected: RaidRoundId[] = ['round1', 'round2', 'round3'];
  value.rounds.forEach((round, index) => {
    if (round.roundId !== expected[index]) {
      context.addIssue({ code: 'custom', path: ['rounds', index, 'roundId'], message: 'Raid rounds must be ordered.' });
    }
  });
});
export type RaidResult = z.infer<typeof RaidResultSchema>;

export const CreepDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  stats: z.object({
    hp: z.number().positive(),
    atk: z.number().positive(),
    def: z.number().nonnegative(),
    attacksPerSecond: z.number().positive(),
    range: z.number().positive(),
    moveSpeed: z.number().positive(),
  }),
});
export type CreepDefinition = z.infer<typeof CreepDefinitionSchema>;
