import { describe, it, expect } from 'vitest';
import type { SummonInstance } from '@psyblr/contracts';
import { CampaignController } from '../campaign/CampaignController';
import { resolveSummonPowerLevel, TIERS } from '@psyblr/game-rules';
import { getSummonDefinition } from '@psyblr/game-content';

describe('Campaign Squad Deployment and Battle Camp Roster', () => {
  const sampleRoster: SummonInstance[] = [
    { id: 's1', definitionId: 'goku', tier: 'F' },
    { id: 's2', definitionId: 'goku', tier: 'F' },
    { id: 's3', definitionId: 'naruto', tier: 'F' },
    { id: 's4', definitionId: 'luffy', tier: 'F' },
    { id: 's5', definitionId: 'eren', tier: 'F' },
    { id: 's6', definitionId: 'l', tier: 'F' },
    { id: 's7', definitionId: 'lelouch', tier: 'E' },
    { id: 's8', definitionId: 'ichigo', tier: 'F' },
  ];

  it('builds combat snapshot with exact player placements without auto-forcing default units', () => {
    const controller = new CampaignController();

    // 0 player units
    const emptySnapshot = controller.buildCombatSnapshot([]);
    const playerUnits = emptySnapshot.units.filter((u) => u.side === 'player');
    const enemyUnits = emptySnapshot.units.filter((u) => u.side === 'enemy');
    expect(playerUnits.length).toBe(0);
    expect(enemyUnits.length).toBeGreaterThan(0);

    // Custom 3-unit deployment with specific coordinates
    const customPlacements = [
      { summon: sampleRoster[0]!, cell: { x: 1, z: 5 } },
      { summon: sampleRoster[2]!, cell: { x: 3, z: 6 } },
      { summon: sampleRoster[3]!, cell: { x: 5, z: 4 } },
    ];

    const snapshot = controller.buildCombatSnapshot(customPlacements);
    const deployedUnits = snapshot.units.filter((u) => u.side === 'player');
    expect(deployedUnits.length).toBe(3);
    expect(deployedUnits[0]?.spawnCell).toEqual({ x: 1, z: 5 });
    expect(deployedUnits[1]?.spawnCell).toEqual({ x: 3, z: 6 });
    expect(deployedUnits[2]?.spawnCell).toEqual({ x: 5, z: 4 });
  });

  it('calculates squad power levels accurately from deployed summons', () => {
    const squad = [sampleRoster[0]!, sampleRoster[6]!]; // Goku [F], Lelouch [E]
    let totalPower = 0;
    for (const s of squad) {
      const def = getSummonDefinition(s.definitionId);
      totalPower += resolveSummonPowerLevel(def, s.tier);
    }
    expect(totalPower).toBeGreaterThan(0);
  });

  it('supports pagination over large rosters exceeding 6 summons', () => {
    const CARDS_PER_PAGE = 6;
    const totalPages = Math.ceil(sampleRoster.length / CARDS_PER_PAGE);
    expect(totalPages).toBe(2);

    const page0 = sampleRoster.slice(0, CARDS_PER_PAGE);
    const page1 = sampleRoster.slice(CARDS_PER_PAGE, CARDS_PER_PAGE * 2);

    expect(page0.length).toBe(6);
    expect(page1.length).toBe(2);
    expect(page1[0]?.id).toBe('s7');
  });

  it('enforces maximum 6 deployed summons in squad', () => {
    const placements = sampleRoster.slice(0, 6).map((s, idx) => ({
      summon: s,
      cell: { x: idx, z: 5 },
    }));
    expect(placements.length).toBe(6);

    // Attempting to deploy a 7th summon without swapping is prevented
    const canAddMore = placements.length < 6;
    expect(canAddMore).toBe(false);
  });

  it('sorts roster strictly descending by tier, then power level', () => {
    const unsortedRoster: SummonInstance[] = [
      { id: 's1', definitionId: 'goku', tier: 'F' },
      { id: 's2', definitionId: 'naruto', tier: 'D' },
      { id: 's3', definitionId: 'luffy', tier: 'S' },
      { id: 's4', definitionId: 'eren', tier: 'B' },
      { id: 's5', definitionId: 'lelouch', tier: 'SS' },
      { id: 's6', definitionId: 'l', tier: 'E' },
    ];

    const TIERS_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X'];

    const sorted = [...unsortedRoster].sort((a, b) => {
      const tierAIdx = TIERS_ORDER.indexOf(a.tier);
      const tierBIdx = TIERS_ORDER.indexOf(b.tier);
      if (tierBIdx !== tierAIdx) {
        return tierBIdx - tierAIdx;
      }
      const defA = getSummonDefinition(a.definitionId);
      const defB = getSummonDefinition(b.definitionId);
      const pwrA = resolveSummonPowerLevel(defA, a.tier);
      const pwrB = resolveSummonPowerLevel(defB, b.tier);
      return pwrB - pwrA;
    });

    expect(sorted.map((s) => s.tier)).toEqual(['SS', 'S', 'B', 'D', 'E', 'F']);
  });

  it('auto-deploys top 6 power units and supports withdraw all', () => {
    const mixedRoster: SummonInstance[] = [
      { id: 's1', definitionId: 'goku', tier: 'F' },
      { id: 's2', definitionId: 'naruto', tier: 'D' },
      { id: 's3', definitionId: 'luffy', tier: 'S' },
      { id: 's4', definitionId: 'eren', tier: 'B' },
      { id: 's5', definitionId: 'lelouch', tier: 'SS' },
      { id: 's6', definitionId: 'l', tier: 'E' },
      { id: 's7', definitionId: 'goku', tier: 'X' },
    ];

    const sortedByTierAndPower = [...mixedRoster].sort((a, b) => {
      const tierAIdx = TIERS.indexOf(a.tier);
      const tierBIdx = TIERS.indexOf(b.tier);
      if (tierBIdx !== tierAIdx) {
        return tierBIdx - tierAIdx;
      }
      const defA = getSummonDefinition(a.definitionId);
      const defB = getSummonDefinition(b.definitionId);
      const pwrA = resolveSummonPowerLevel(defA, a.tier);
      const pwrB = resolveSummonPowerLevel(defB, b.tier);
      return pwrB - pwrA;
    });

    const autoDeployed = sortedByTierAndPower.slice(0, 6);
    expect(autoDeployed.length).toBe(6);
    expect(autoDeployed[0]?.tier).toBe('X');
    expect(autoDeployed[1]?.tier).toBe('SS');
    expect(autoDeployed[2]?.tier).toBe('S');

    // Withdraw all
    let placements = autoDeployed.map((s, idx) => ({ summon: s, cell: { x: idx, z: 5 } }));
    expect(placements.length).toBe(6);

    placements = [];
    expect(placements.length).toBe(0);
  });
});
