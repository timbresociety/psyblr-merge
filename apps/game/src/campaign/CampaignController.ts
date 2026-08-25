import type { CombatSnapshot, CombatUnitSnapshot } from '@psyblr/contracts';
import { getSummonDefinition } from '@psyblr/game-content';
import { resolveTierStats } from '@psyblr/game-rules';
import type { SummonInstance } from '@psyblr/contracts';

export interface CampaignArc {
  arcNumber: number;
  title: string;
  description: string;
  themeColor: string;
}

export const CAMPAIGN_ARCS: CampaignArc[] = [
  { arcNumber: 1, title: 'Awakening', description: 'Begin your journey across the forgotten dimensional wastes.', themeColor: '#38bdf8' },
  { arcNumber: 2, title: 'Titanfall', description: 'Face colossal siege behemoths at the fortress wall.', themeColor: '#22c55e' },
  { arcNumber: 3, title: 'Zero Requiem', description: 'Infiltrate the imperial dominion and dismantle the high throne.', themeColor: '#a855f7' },
  { arcNumber: 4, title: 'Super Saiyan Horizon', description: 'Ascend beyond all mortal limits in the astral crucible.', themeColor: '#f59e0b' },
];

export interface CampaignSquadPlacement {
  summon: SummonInstance;
  cell: { x: number; z: number };
}

export class CampaignController {
  public currentLevel: number = 1;
  public highestClearedLevel: number = 0;

  constructor() {
    this.loadPersistedState();
  }

  public loadPersistedState(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedLevel = localStorage.getItem('psyblr_campaign_level');
        const savedHighest = localStorage.getItem('psyblr_campaign_highest');
        if (savedLevel !== null) this.currentLevel = parseInt(savedLevel, 10) || 1;
        if (savedHighest !== null) this.highestClearedLevel = parseInt(savedHighest, 10) || 0;
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  }

  public saveState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('psyblr_campaign_level', this.currentLevel.toString());
        localStorage.setItem('psyblr_campaign_highest', this.highestClearedLevel.toString());
      }
    } catch {
      // Ignore
    }
  }

  public reset(): void {
    this.currentLevel = 1;
    this.highestClearedLevel = 0;
    this.saveState();
  }

  getArcForLevel(level: number = this.currentLevel): CampaignArc {
    const arcIndex = Math.floor((level - 1) / 100);
    return CAMPAIGN_ARCS[arcIndex % CAMPAIGN_ARCS.length]!;
  }

  isMiniBossLevel(level: number = this.currentLevel): boolean {
    return level % 10 === 0 && level % 100 !== 0;
  }

  isMainBossLevel(level: number = this.currentLevel): boolean {
    return level % 100 === 0;
  }

  shouldAutoProgressPause(level: number = this.currentLevel): boolean {
    return level % 10 === 0;
  }

  buildCombatSnapshot(
    playerSummonsOrPlacements: readonly SummonInstance[] | readonly CampaignSquadPlacement[]
  ): CombatSnapshot {
    const level = this.currentLevel;
    const isBoss = this.isMainBossLevel(level);
    const isMiniBoss = this.isMiniBossLevel(level);

    const defaultSpawnCells = [
      { x: 1, z: 5 }, { x: 3, z: 5 }, { x: 5, z: 5 },
      { x: 2, z: 6 }, { x: 4, z: 6 }, { x: 6, z: 6 },
    ];

    // 1. Build Player Units (z >= 4)
    const playerUnits: CombatUnitSnapshot[] = playerSummonsOrPlacements.slice(0, 6).map((item, index) => {
      const isPlacement = 'cell' in item;
      const summon = isPlacement ? (item as CampaignSquadPlacement).summon : (item as SummonInstance);
      const cell = isPlacement ? (item as CampaignSquadPlacement).cell : (defaultSpawnCells[index] ?? { x: index + 1, z: 5 });

      const def = getSummonDefinition(summon.definitionId);
      const stats = resolveTierStats(def.stats, summon.tier);

      return {
        id: `player:${summon.id}:${index}`,
        definitionId: summon.definitionId,
        side: 'player',
        spawnCell: cell,
        hp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        attacksPerSecond: stats.attacksPerSecond,
        range: stats.range,
        moveSpeed: stats.moveSpeed,
        skill1Id: def.skills.skill1,
        skill1: {
          kind: 'line_damage',
          cooldownMs: 4000,
          initialDelayMs: 2000,
          damageMultiplier: 2.0,
          radius: 1.5,
          presentationKey: 'strike',
        },
        basicAttackDamagePct: 0,
        skillPowerPct: 0,
        statusDurationPct: 0,
      };
    });

    // 2. Build Enemy Units (z < 4) with scaling based on level
    const levelScaling = 1 + (level - 1) * 0.08;
    const enemyUnits: CombatUnitSnapshot[] = [];

    if (isBoss) {
      // Main Boss (Colossal story boss at center)
      enemyUnits.push({
        id: `boss:${level}:main`,
        definitionId: 'main_boss',
        side: 'enemy',
        spawnCell: { x: 3, z: 1 },
        hp: Math.round(5000 * levelScaling),
        atk: Math.round(220 * levelScaling),
        def: Math.round(140 * levelScaling),
        attacksPerSecond: 1.2,
        range: 3.5,
        moveSpeed: 3.8,
        skill1Id: 'boss_skill',
        skill1: {
          kind: 'aoe_slow',
          cooldownMs: 5000,
          initialDelayMs: 2000,
          damageMultiplier: 2.5,
          radius: 3.0,
          durationMs: 3000,
          slowPercent: 50,
          presentationKey: 'titan_slam',
        },
        basicAttackDamagePct: 0,
        skillPowerPct: 0,
        statusDurationPct: 0,
      });
      // 2 Elite Minions
      enemyUnits.push({
        id: `boss:${level}:minion1`,
        definitionId: 'creep_brute',
        side: 'enemy',
        spawnCell: { x: 1, z: 2 },
        hp: Math.round(1800 * levelScaling),
        atk: Math.round(120 * levelScaling),
        def: Math.round(80 * levelScaling),
        attacksPerSecond: 0.9,
        range: 1.2,
        moveSpeed: 3.5,
        skill1Id: null,
        skill1: null,
        basicAttackDamagePct: 0,
        skillPowerPct: 0,
        statusDurationPct: 0,
      });
      enemyUnits.push({
        id: `boss:${level}:minion2`,
        definitionId: 'creep_shooter',
        side: 'enemy',
        spawnCell: { x: 5, z: 2 },
        hp: Math.round(1400 * levelScaling),
        atk: Math.round(150 * levelScaling),
        def: Math.round(60 * levelScaling),
        attacksPerSecond: 1.1,
        range: 4.0,
        moveSpeed: 3.0,
        skill1Id: null,
        skill1: null,
        basicAttackDamagePct: 0,
        skillPowerPct: 0,
        statusDurationPct: 0,
      });
    } else if (isMiniBoss) {
      // Mini-Boss + 5 creeps
      enemyUnits.push({
        id: `miniboss:${level}:0`,
        definitionId: 'mini_boss',
        side: 'enemy',
        spawnCell: { x: 3, z: 1 },
        hp: Math.round(2800 * levelScaling),
        atk: Math.round(160 * levelScaling),
        def: Math.round(100 * levelScaling),
        attacksPerSecond: 1.0,
        range: 1.8,
        moveSpeed: 4.2,
        skill1Id: 'mini_boss_skill',
        skill1: {
          kind: 'dash_aoe',
          cooldownMs: 4500,
          initialDelayMs: 2500,
          damageMultiplier: 1.8,
          radius: 2.0,
          dashDistance: 2.0,
          presentationKey: 'warlord_charge',
        },
        basicAttackDamagePct: 0,
        skillPowerPct: 0,
        statusDurationPct: 0,
      });

      const miniCreeps = ['creep_brute', 'creep_scout', 'creep_shooter', 'creep_scout', 'creep_shooter'];
      const enemyCells = [
        { x: 1, z: 2 }, { x: 2, z: 2 }, { x: 4, z: 2 }, { x: 5, z: 2 }, { x: 3, z: 3 },
      ];
      miniCreeps.forEach((creepDef, idx) => {
        enemyUnits.push({
          id: `miniboss:${level}:${idx + 1}`,
          definitionId: creepDef,
          side: 'enemy',
          spawnCell: enemyCells[idx]!,
          hp: Math.round(750 * levelScaling),
          atk: Math.round(65 * levelScaling),
          def: Math.round(40 * levelScaling),
          attacksPerSecond: 0.9,
          range: creepDef === 'creep_shooter' ? 3.5 : 1.2,
          moveSpeed: 3.5,
          skill1Id: null,
          skill1: null,
          basicAttackDamagePct: 0,
          skillPowerPct: 0,
          statusDurationPct: 0,
        });
      });
    } else {
      // Normal Creep Squad (6 creeps)
      const creeps = ['creep_brute', 'creep_scout', 'creep_brute', 'creep_shooter', 'creep_scout', 'creep_shooter'];
      const enemyCells = [
        { x: 1, z: 1 }, { x: 3, z: 1 }, { x: 5, z: 1 },
        { x: 2, z: 2 }, { x: 4, z: 2 }, { x: 6, z: 2 },
      ];
      creeps.forEach((creepDef, idx) => {
        enemyUnits.push({
          id: `creep:${level}:${idx}`,
          definitionId: creepDef,
          side: 'enemy',
          spawnCell: enemyCells[idx]!,
          hp: Math.round(600 * levelScaling),
          atk: Math.round(55 * levelScaling),
          def: Math.round(35 * levelScaling),
          attacksPerSecond: 0.85,
          range: creepDef === 'creep_shooter' ? 3.5 : 1.2,
          moveSpeed: 3.2,
          skill1Id: null,
          skill1: null,
          basicAttackDamagePct: 0,
          skillPowerPct: 0,
          statusDurationPct: 0,
        });
      });
    }

    return {
      battleId: `campaign_${level}_${Date.now()}`,
      mode: 'campaign',
      units: [...playerUnits, ...enemyUnits],
    };
  }

  onVictory(): { levelCleared: number; nextLevel: number; medalsReward: number; ballsReward: number } {
    const cleared = this.currentLevel;
    if (cleared > this.highestClearedLevel) {
      this.highestClearedLevel = cleared;
    }
    this.currentLevel++;
    this.saveState();
    // Medals awarded every 10 levels (10, 20, 30, ...)
    const medalsReward = this.isMainBossLevel(cleared) ? 25 : this.isMiniBossLevel(cleared) ? 10 : 0;
    return { levelCleared: cleared, nextLevel: this.currentLevel, medalsReward, ballsReward: medalsReward };
  }
}
