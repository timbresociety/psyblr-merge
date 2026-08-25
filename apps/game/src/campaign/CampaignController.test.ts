import { describe, it, expect } from 'vitest';
import { CampaignController } from './CampaignController';
import type { SummonInstance } from '@psyblr/contracts';

describe('CampaignController', () => {
  it('identifies Story Arcs correctly across 100-level thresholds', () => {
    const controller = new CampaignController();

    const arc1 = controller.getArcForLevel(1);
    expect(arc1.arcNumber).toBe(1);
    expect(arc1.title).toBe('Awakening');

    const arc1End = controller.getArcForLevel(100);
    expect(arc1End.arcNumber).toBe(1);

    const arc2 = controller.getArcForLevel(101);
    expect(arc2.arcNumber).toBe(2);
    expect(arc2.title).toBe('Titanfall');

    const arc3 = controller.getArcForLevel(201);
    expect(arc3.arcNumber).toBe(3);
    expect(arc3.title).toBe('Zero Requiem');
  });

  it('identifies mini-boss and main boss levels correctly and triggers auto-progress pause', () => {
    const controller = new CampaignController();

    expect(controller.isMiniBossLevel(10)).toBe(true);
    expect(controller.isMiniBossLevel(20)).toBe(true);
    expect(controller.isMiniBossLevel(100)).toBe(false); // Level 100 is main boss, not mini boss

    expect(controller.isMainBossLevel(100)).toBe(true);
    expect(controller.isMainBossLevel(200)).toBe(true);
    expect(controller.isMainBossLevel(10)).toBe(false);

    expect(controller.shouldAutoProgressPause(10)).toBe(true);
    expect(controller.shouldAutoProgressPause(100)).toBe(true);
    expect(controller.shouldAutoProgressPause(5)).toBe(false);
  });

  it('builds valid CombatSnapshot for 6v6 campaign battles', () => {
    const controller = new CampaignController();
    const playerSummons: SummonInstance[] = [
      { id: 'p1', definitionId: 'goku', tier: 'F' },
      { id: 'p2', definitionId: 'naruto', tier: 'F' },
      { id: 'p3', definitionId: 'luffy', tier: 'F' },
      { id: 'p4', definitionId: 'eren', tier: 'F' },
      { id: 'p5', definitionId: 'l', tier: 'F' },
      { id: 'p6', definitionId: 'lelouch', tier: 'F' },
    ];

    const snapshot = controller.buildCombatSnapshot(playerSummons);
    expect(snapshot.mode).toBe('campaign');
    expect(snapshot.units.length).toBe(12); // 6 player + 6 enemy

    const playerUnits = snapshot.units.filter((u) => u.side === 'player');
    const enemyUnits = snapshot.units.filter((u) => u.side === 'enemy');
    expect(playerUnits.length).toBe(6);
    expect(enemyUnits.length).toBe(6);
  });

  it('advances levels and grants medals on 10-level milestones', () => {
    const controller = new CampaignController();
    expect(controller.currentLevel).toBe(1);

    // Normal level 1 victory: 0 medals
    const v1 = controller.onVictory();
    expect(v1.levelCleared).toBe(1);
    expect(v1.nextLevel).toBe(2);
    expect(v1.medalsReward).toBe(0);
    expect(controller.currentLevel).toBe(2);

    // Mini-boss level 10 victory: 10 medals
    controller.currentLevel = 10;
    const v10 = controller.onVictory();
    expect(v10.levelCleared).toBe(10);
    expect(v10.medalsReward).toBe(10);

    // Arc boss level 100 victory: 25 medals
    controller.currentLevel = 100;
    const v100 = controller.onVictory();
    expect(v100.levelCleared).toBe(100);
    expect(v100.medalsReward).toBe(25);
  });
});
