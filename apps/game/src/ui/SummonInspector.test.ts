import { describe, it, expect } from 'vitest';
import {
  getSummonDefinition,
  getOriginDefinition,
  getCombatFunctionDefinition,
  getSkillDefinition,
} from '@psyblr/game-content';
import {
  resolveTierStats,
  nextTierStatDelta,
  nextTier,
  TIER_MULTIPLIER,
  TIERS,
} from '@psyblr/game-rules';
import type { SummonInstance, Tier } from '@psyblr/contracts';

describe('SummonInspector Data Calculations', () => {
  it('correctly resolves Goku identity, origin, combat function, and stats across tiers', () => {
    const starterGoku: SummonInstance = {
      id: 'starter:goku:001',
      definitionId: 'goku',
      tier: 'F',
    };

    const def = getSummonDefinition(starterGoku.definitionId);
    expect(def.displayName).toBe('Goku');

    const origin = getOriginDefinition(def.originId);
    expect(origin.name).toBe('Ascendant');

    const fn = getCombatFunctionDefinition(def.combatFunctionId);
    expect(fn.name).toBe('Striker');

    // Tier F Stats (1.00x)
    const statsF = resolveTierStats(def.stats, 'F');
    expect(statsF.hp).toBe(1000);
    expect(statsF.atk).toBe(120);
    expect(statsF.def).toBe(70);

    // Tier E Stats (1.15x)
    const statsE = resolveTierStats(def.stats, 'E');
    expect(statsE.hp).toBe(1150);
    expect(statsE.atk).toBe(138);
    expect(statsE.def).toBe(81);

    // Delta from F to E
    const delta = nextTierStatDelta(def.stats, 'F');
    expect(delta).toEqual({
      hp: 150,
      atk: 18,
      def: 11,
    });

    // Tier Progression Rail
    expect(TIERS.length).toBe(9);
    expect(TIERS[0]).toBe('F');
    expect(TIERS[8]).toBe('SSS');
    expect(nextTier('F')).toBe('E');
    expect(nextTier('SSS')).toBeNull();
  });

  it('correctly maps 4 ability slots including active basic, active skill 1, and locked slots', () => {
    const def = getSummonDefinition('goku');
    const basic = getSkillDefinition(def.skills.basic);
    const skill1 = getSkillDefinition(def.skills.skill1);

    expect(basic.name).toBe('Ki Strike');
    expect(basic.type).toBe('basic');

    expect(skill1.name).toBe('Ki Burst');
    expect(skill1.type).toBe('active');
    expect(skill1.mechanics?.kind).toBe('line_damage');

    expect(def.skills.skill2).toBeNull();
    expect(def.skills.ultimate).toBeNull();
  });
});
