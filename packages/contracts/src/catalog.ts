import { z } from 'zod';

export const LAUNCH_SUMMON_COUNT = 36;
export const TIER_COUNT = 10;
export const ALLIANCE_THRESHOLDS = [2, 4, 6] as const;

export const CatalogTierDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().min(1).max(TIER_COUNT),
  statMultiplier: z.number().positive(),
  visualFormKey: z.string().min(1).optional(),
});
export type CatalogTierDefinition = z.infer<typeof CatalogTierDefinitionSchema>;

export const CatalogTierProgressionSchema = z.array(CatalogTierDefinitionSchema)
  .length(TIER_COUNT)
  .superRefine((tiers, ctx) => {
    const ids = new Set(tiers.map((tier) => tier.id));
    if (ids.size !== TIER_COUNT) {
      ctx.addIssue({ code: 'custom', message: 'Tier ids must be unique.' });
    }

    const orders = [...tiers.map((tier) => tier.order)].sort((a, b) => a - b);
    const expected = Array.from({ length: TIER_COUNT }, (_, index) => index + 1);
    if (orders.some((order, index) => order !== expected[index])) {
      ctx.addIssue({ code: 'custom', message: 'Tier orders must contain every value from 1 through 10 exactly once.' });
    }
  });
export type CatalogTierProgression = z.infer<typeof CatalogTierProgressionSchema>;

export const AllianceEffectFamilySchema = z.enum([
  'offense',
  'defense',
  'mobility',
  'skill_economy',
  'status_control',
  'sustain',
]);
export type AllianceEffectFamily = z.infer<typeof AllianceEffectFamilySchema>;

export const AllianceStatSchema = z.enum([
  'atk_pct',
  'crit_chance_pct',
  'crit_damage_pct',
  'def_pct',
  'block_chance_pct',
  'attack_speed_pct',
  'dodge_chance_pct',
  'move_speed_pct',
  'skill_power_pct',
  'cooldown_reduction_pct',
  'buff_potency_pct',
  'debuff_potency_pct',
  'crowd_control_duration_pct',
  'max_hp_pct',
  'healing_power_pct',
  'drain_pct',
]);
export type AllianceStat = z.infer<typeof AllianceStatSchema>;

export const AllianceModifierSchema = z.object({
  stat: AllianceStatSchema,
  value: z.number(),
});
export type AllianceModifier = z.infer<typeof AllianceModifierSchema>;

export const AllianceThresholdSchema = z.object({
  count: z.union([z.literal(2), z.literal(4), z.literal(6)]),
  description: z.string().min(1),
  modifiers: z.array(AllianceModifierSchema).min(1),
});
export type AllianceThreshold = z.infer<typeof AllianceThresholdSchema>;

export const CatalogAllianceDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  effectFamily: AllianceEffectFamilySchema,
  thresholds: z.array(AllianceThresholdSchema).length(3),
}).superRefine((alliance, ctx) => {
  const counts = [...alliance.thresholds.map((threshold) => threshold.count)].sort((a, b) => a - b);
  if (counts[0] !== 2 || counts[1] !== 4 || counts[2] !== 6) {
    ctx.addIssue({ code: 'custom', message: 'Every Alliance must define exactly 2, 4, and 6 Summon thresholds.' });
  }
});
export type CatalogAllianceDefinition = z.infer<typeof CatalogAllianceDefinitionSchema>;

export const CatalogSummonStatsSchema = z.object({
  hp: z.number().positive(),
  atk: z.number().positive(),
  def: z.number().nonnegative(),
  critChance: z.number().min(0),
  blockChance: z.number().min(0),
  attacksPerSecond: z.number().positive(),
  dodgeChance: z.number().min(0),
  range: z.number().positive(),
  moveSpeed: z.number().positive(),
  skillPower: z.number().nonnegative(),
  healingPower: z.number().nonnegative(),
  drain: z.number().min(0),
});
export type CatalogSummonStats = z.infer<typeof CatalogSummonStatsSchema>;

export const CatalogSummonSkillsSchema = z.object({
  basic: z.string().min(1),
  skill1: z.string().min(1),
  skill2: z.string().min(1),
  ultimate: z.string().min(1),
});
export type CatalogSummonSkills = z.infer<typeof CatalogSummonSkillsSchema>;

export const CatalogSummonDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  summary: z.string().min(1),
  allianceId: z.string().min(1),
  stats: CatalogSummonStatsSchema,
  skills: CatalogSummonSkillsSchema,
  assetManifest: z.string().min(1),
  portraitUrl: z.string().min(1).optional(),
});
export type CatalogSummonDefinition = z.infer<typeof CatalogSummonDefinitionSchema>;

export const LaunchSummonCatalogSchema = z.array(CatalogSummonDefinitionSchema)
  .length(LAUNCH_SUMMON_COUNT)
  .superRefine((summons, ctx) => {
    const ids = new Set(summons.map((summon) => summon.id));
    if (ids.size !== LAUNCH_SUMMON_COUNT) {
      ctx.addIssue({ code: 'custom', message: 'Launch Summon ids must be unique.' });
    }
  });
export type LaunchSummonCatalog = z.infer<typeof LaunchSummonCatalogSchema>;

export const GameCatalogSchema = z.object({
  tiers: CatalogTierProgressionSchema,
  alliances: z.array(CatalogAllianceDefinitionSchema).min(1),
  summons: LaunchSummonCatalogSchema,
}).superRefine((catalog, ctx) => {
  const allianceIds = new Set(catalog.alliances.map((alliance) => alliance.id));
  if (allianceIds.size !== catalog.alliances.length) {
    ctx.addIssue({ code: 'custom', message: 'Alliance ids must be unique.' });
  }

  for (const summon of catalog.summons) {
    if (!allianceIds.has(summon.allianceId)) {
      ctx.addIssue({ code: 'custom', message: `Summon ${summon.id} references unknown Alliance ${summon.allianceId}.` });
    }
  }
});
export type GameCatalog = z.infer<typeof GameCatalogSchema>;
