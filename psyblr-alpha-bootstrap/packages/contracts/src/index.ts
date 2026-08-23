import { z } from 'zod';

export const TierSchema = z.enum(['F','E','D','C','B','A','S','SS','SSS']);
export type Tier = z.infer<typeof TierSchema>;

export const SummonDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  originId: z.string().min(1),
  combatFunctionId: z.string().min(1),
  stats: z.object({
    hp: z.number().positive(), atk: z.number().positive(), def: z.number().nonnegative(),
    attacksPerSecond: z.number().positive(), range: z.number().positive(), moveSpeed: z.number().positive()
  }),
  skills: z.object({
    basic: z.string(), skill1: z.string(), skill2: z.string().nullable(), ultimate: z.string().nullable()
  }),
  assetManifest: z.string(),
  portraitUrl: z.string().min(1).optional()
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

export const SynergyEffectSchema = z.object({
  stat: z.enum(['attack_speed_pct', 'max_hp_pct', 'skill_power_pct', 'basic_attack_damage_pct', 'status_duration_pct', 'durability_pct']),
  value: z.number().nonnegative(),
});
export type SynergyEffect = z.infer<typeof SynergyEffectSchema>;

const SynergyThresholdSchema = z.object({
  count: z.number().int().positive(),
  effect: z.string().min(1),
  mechanics: z.array(SynergyEffectSchema).default([]),
});

export const OriginDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  thresholds: z.array(SynergyThresholdSchema),
});
export type OriginDefinition = z.infer<typeof OriginDefinitionSchema>;

export const CombatFunctionDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  thresholds: z.array(SynergyThresholdSchema),
});
export type CombatFunctionDefinition = z.infer<typeof CombatFunctionDefinitionSchema>;

export const SkillMechanicsSchema = z.object({
  kind: z.enum(['line_damage', 'aoe_slow', 'dash_aoe', 'taunt_shield', 'mark_vulnerability', 'stun']),
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
  type: z.enum(['basic', 'active', 'ultimate']),
  summary: z.string().min(1),
  mechanics: SkillMechanicsSchema.optional(),
});
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

export const CampCellSchema = z.object({ x: z.number().int().min(0).max(5), y: z.number().int().min(0).max(5) });
export type CampCell = z.infer<typeof CampCellSchema>;

export const CampPlacementSchema = z.object({
  summonInstanceId: z.string().min(1),
  cell: CampCellSchema,
});
export type CampPlacement = z.infer<typeof CampPlacementSchema>;

export const BaseBuildingSocketSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['battle_camp', 'spawn_machine', 'raid_gate', 'future']),
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

export const RaidSquadSchema = z.object({
  round1: z.array(z.string()).length(1),
  round2: z.array(z.string()).length(3).refine(v => new Set(v).size === 3, 'Round 2 summons must be unique'),
  round3: z.array(z.string()).length(6).refine(v => new Set(v).size === 6, 'Round 3 summons must be unique')
});

export const TutorialActionSchema = z.enum([
  'OPEN_INVENTORY', 'SELECT_SUMMON', 'VIEW_STATS', 'VIEW_SKILLS', 'PLACE_SUMMON', 'REPOSITION_SUMMON',
  'RECALL_SUMMON', 'INSPECT_SUMMON', 'VIEW_SYNERGIES', 'START_BATTLE', 'CAST_SKILL_1', 'TOGGLE_AUTO_CAST',
  'TUTORIAL_CONTINUE', 'SELECT_CAMP_SUMMON', 'MOVE_CAMP_SUMMON', 'OPEN_SPAWN_MACHINE', 'DROP_BALL', 'LONG_PRESS_DROP', 'MERGE_SUMMONS',
  'VIEW_PROGRESS', 'SELECT_RAID_SUMMON', 'START_RAID', 'SELECT_STEAL', 'CONFIRM_STEAL', 'SELECT_DEFENSE_SUMMON', 'SAVE_DEFENSE',
]);
export type TutorialAction = z.infer<typeof TutorialActionSchema>;

export const TutorialStepSchema = z.object({
  id: z.string(), phase: z.string(), scene: z.enum(['campaign','base','raid','opponentCamp']),
  cameraPreset: z.string().nullable(), title: z.string(), body: z.string(),
  highlightTarget: z.string().nullable(), allowedActions: z.array(TutorialActionSchema), completionEvent: z.string(),
  completionMatch: z.record(z.string(), z.string().or(z.number()).or(z.boolean()).or(z.null())).optional(), nextStep: z.string().nullable()
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
  mode: z.literal('campaign'),
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
  type: z.enum(['spawn', 'move', 'target_changed', 'basic_attack', 'skill_ready', 'skill_cast', 'damage', 'status_applied', 'status_removed', 'shield_changed', 'death', 'battle_end']),
  actorId: z.string().nullable(), targetId: z.string().nullable(), payload: z.record(z.string(), z.unknown()).default({})
});
export type CombatEvent = z.infer<typeof CombatEventSchema>;

export const CreepDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  stats: z.object({
    hp: z.number().positive(), atk: z.number().positive(), def: z.number().nonnegative(),
    attacksPerSecond: z.number().positive(), range: z.number().positive(), moveSpeed: z.number().positive(),
  }),
});
export type CreepDefinition = z.infer<typeof CreepDefinitionSchema>;
