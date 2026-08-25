import { describe, expect, it } from 'vitest';
import {
  allianceDefinitions,
  getAllianceDefinition,
  getSkillDefinition,
  creepDefinitions,
  summonDefinitions,
  spawnMachineDefinition,
} from './index';

describe('starter content references', () => {
  it('resolves every starter alliance, quote, description, and full combat kit', () => {
    for (const summon of summonDefinitions) {
      expect(getAllianceDefinition(summon.allianceId).name).toBeTruthy();
      expect(summon.description).toBeTruthy();
      expect(summon.quote).toBeTruthy();
      expect(getSkillDefinition(summon.skills.basic).type).toBe('basic');
      const skill1 = getSkillDefinition(summon.skills.skill1);
      expect(skill1.type).toBe('active');
      expect(skill1.mechanics?.cooldownMs).toBeGreaterThan(0);
      expect(skill1.mechanics?.initialDelayMs).toBeGreaterThanOrEqual(0);

      if (summon.skills.skill2) {
        const skill2 = getSkillDefinition(summon.skills.skill2);
        expect(skill2.type).toBe('active');
      }
      if (summon.skills.ultimate) {
        const ult = getSkillDefinition(summon.skills.ultimate);
        expect(ult.type).toBe('ultimate');
      }
      if (summon.passiveId) {
        const passive = getSkillDefinition(summon.passiveId);
        expect(passive.type).toBe('passive');
      }
    }
  });

  it('validates exactly 6 Alliances with thresholds 2, 4, 6', () => {
    expect(allianceDefinitions).toHaveLength(6);
    for (const alliance of allianceDefinitions) {
      const counts = alliance.thresholds.map((t) => t.count);
      expect(counts).toEqual([2, 4, 6]);
    }
  });

  it('contains the three creep archetypes used by the six-unit campaign formation', () => {
    expect(creepDefinitions.map((entry) => entry.id)).toEqual(['creep_brute', 'creep_scout', 'creep_shooter']);
  });
});

describe('spawn machine content', () => {
  it('has the canonical 10/15/25/25/15/10 pool probabilities', () => {
    expect(spawnMachineDefinition.binProbabilities).toEqual([10, 15, 25, 25, 15, 10]);
    expect(spawnMachineDefinition.binProbabilities.reduce((total, value) => total + value, 0)).toBe(100);
  });
});
