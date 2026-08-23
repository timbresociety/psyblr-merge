import { describe, expect, it } from 'vitest';
import {
  getCombatFunctionDefinition,
  getOriginDefinition,
  getSkillDefinition,
  summonDefinitions,
} from './index';

describe('starter content references', () => {
  it('resolves every starter origin, function, basic attack, and Skill 1', () => {
    for (const summon of summonDefinitions) {
      expect(getOriginDefinition(summon.originId).name).toBeTruthy();
      expect(getCombatFunctionDefinition(summon.combatFunctionId).name).toBeTruthy();
      expect(getSkillDefinition(summon.skills.basic).type).toBe('basic');
      expect(getSkillDefinition(summon.skills.skill1).type).toBe('active');
    }
  });
});
