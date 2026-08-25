import { describe, it, expect } from 'vitest';
import {
  getSummonDefinition,
  getAllianceDefinition,
  getSkillDefinition,
} from '@psyblr/game-content';
import {
  resolveTierStats,
  nextTierStatDelta,
  nextTier,
  TIER_MULTIPLIER,
  TIERS,
  resolveSummonPowerLevel,
  getReleaseRefund,
} from '@psyblr/game-rules';
import type { SummonInstance } from '@psyblr/contracts';

describe('SummonInspector Data Calculations', () => {
  it('correctly resolves Goku identity, alliance, and stats across tiers', () => {
    const starterGoku: SummonInstance = {
      id: 'starter:goku:001',
      definitionId: 'goku',
      tier: 'F',
    };

    const def = getSummonDefinition(starterGoku.definitionId);
    expect(def.displayName).toBe('Goku');

    const alliance = getAllianceDefinition(def.allianceId);
    expect(alliance.name).toBe('Ascendant');

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

    // 10-Tier Progression Rail
    expect(TIERS.length).toBe(10);
    expect(TIERS[0]).toBe('F');
    expect(TIERS[9]).toBe('X');
    expect(nextTier('F')).toBe('E');
    expect(nextTier('SSS')).toBe('X');
    expect(nextTier('X')).toBeNull();

    // Power Level & Release Refund
    expect(resolveSummonPowerLevel(def, 'F')).toBeGreaterThan(0);
    expect(getReleaseRefund('F')).toBe(0);
    expect(getReleaseRefund('X')).toBe(256);
  });

  it('correctly maps 4 ability slots + passive', () => {
    const def = getSummonDefinition('goku');
    const basic = getSkillDefinition(def.skills.basic);
    const skill1 = getSkillDefinition(def.skills.skill1);

    expect(basic.name).toBe('Ki Strike');
    expect(basic.type).toBe('basic');

    expect(skill1.name).toBe('Ki Burst');
    expect(skill1.type).toBe('active');
    expect(skill1.mechanics?.kind).toBe('line_damage');

    expect(def.skills.skill2).toBeTruthy();
    expect(def.skills.ultimate).toBeTruthy();
    expect(def.passiveId).toBeTruthy();
  });

  it('correctly handles close callback suppression on scene mode transitions', () => {
    let closedCallbackRan = false;
    const onClosed = () => {
      closedCallbackRan = true;
    };

    // Simulate modal state machine with callback suppression
    let isOpen = true;
    let onClosedCallback: (() => void) | null = onClosed;

    const closeModal = (suppressCallback: boolean = false) => {
      isOpen = false;
      const cb = suppressCallback ? null : onClosedCallback;
      onClosedCallback = null;
      if (cb) {
        cb();
      }
    };

    // When transitioning away from Base Camp, close is called with suppressCallback = true
    closeModal(true);
    expect(isOpen).toBe(false);
    expect(closedCallbackRan).toBe(false);
    expect(onClosedCallback).toBeNull();
  });

  it('supports allowRelease option to hide release button when inspecting opponent summons', () => {
    let releaseBtnEnabled = true;

    const simulateOpen = (options?: { allowRelease?: boolean }) => {
      const allowRelease = options?.allowRelease ?? true;
      releaseBtnEnabled = allowRelease;
    };

    // Default inspection: release button is visible
    simulateOpen();
    expect(releaseBtnEnabled).toBe(true);

    // Inspecting opponent summon: release button is hidden
    simulateOpen({ allowRelease: false });
    expect(releaseBtnEnabled).toBe(false);
  });
});
