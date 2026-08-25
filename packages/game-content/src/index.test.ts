import { describe, expect, it } from 'vitest';
import {
  getCombatFunctionDefinition,
  getOriginDefinition,
  getSkillDefinition,
  creepDefinitions,
  summonDefinitions,
  spawnMachineDefinition,
} from './index';

describe('starter content references', () => {
  it('resolves current legacy synergy references and every starter ability', () => {
    for (const summon of summonDefinitions) {
      expect(getOriginDefinition(summon.originId).name).toBeTruthy();
      expect(getCombatFunctionDefinition(summon.combatFunctionId).name).toBeTruthy();
      expect(getSkillDefinition(summon.skills.basic).type).toBe('basic');
      const skill = getSkillDefinition(summon.skills.skill1);
      expect(skill.type).toBe('active');
      expect(skill.mechanics?.cooldownMs).toBeGreaterThan(0);
      expect(skill.mechanics?.initialDelayMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('contains the three creep archetypes used by the six-unit campaign formation', () => {
    expect(creepDefinitions.map((entry) => entry.id)).toEqual(['creep_brute', 'creep_scout', 'creep_shooter']);
  });
});

describe('spawn machine content', () => {
  it('uses the locked six-bin all-F progression probability shape', () => {
    expect(spawnMachineDefinition.binProbabilities).toEqual([10, 15, 25, 25, 15, 10]);
    expect(spawnMachineDefinition.binProbabilities.reduce((total, value) => total + value, 0)).toBe(100);
    expect(spawnMachineDefinition.blobTargets.map((target) => target.enabled)).toEqual([true, true]);
    expect(spawnMachineDefinition.blobTargets.map((target) => target.id)).toEqual(['shield_left', 'shield_right']);
    expect(spawnMachineDefinition.tutorial).toEqual({ targetCampOccupancy: 8, guaranteeCopiesOfPrimary: 2 });
  });
});
