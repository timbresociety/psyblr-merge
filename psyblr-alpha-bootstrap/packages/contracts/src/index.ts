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

const SynergyThresholdSchema = z.object({
  count: z.number().int().positive(),
  effect: z.string().min(1),
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

export const SkillDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['basic', 'active', 'ultimate']),
  summary: z.string().min(1),
});
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

export const CampCellSchema = z.object({ x: z.number().int().min(0).max(5), y: z.number().int().min(0).max(5) });
export type CampCell = z.infer<typeof CampCellSchema>;

export const RaidSquadSchema = z.object({
  round1: z.array(z.string()).length(1),
  round2: z.array(z.string()).length(3).refine(v => new Set(v).size === 3, 'Round 2 summons must be unique'),
  round3: z.array(z.string()).length(6).refine(v => new Set(v).size === 6, 'Round 3 summons must be unique')
});

export const TutorialStepSchema = z.object({
  id: z.string(), phase: z.string(), scene: z.enum(['campaign','base','raid','opponentCamp']),
  cameraPreset: z.string().nullable(), title: z.string(), body: z.string(),
  highlightTarget: z.string().nullable(), allowedActions: z.array(z.string()), completionEvent: z.string(), nextStep: z.string().nullable()
});

export const CombatEventSchema = z.object({
  tick: z.number().int().nonnegative(),
  type: z.enum(['spawn','move','basic_attack','skill_cast','damage','status','death','round_end']),
  actorId: z.string().nullable(), targetId: z.string().nullable(), payload: z.record(z.string(), z.unknown()).default({})
});
export type CombatEvent = z.infer<typeof CombatEventSchema>;
