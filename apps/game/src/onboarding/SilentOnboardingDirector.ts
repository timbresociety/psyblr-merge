import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import type { SceneManager } from '../app/SceneManager';
import type { HUDRoot } from '../ui/HUDRoot';
import type { TutorialHUD } from '../ui/TutorialHUD';
import { campCellToWorld } from '../world/CampCoordinateMapper';
import type { SummonInstance, Tier } from '@psyblr/contracts';

export type OnboardingPhase =
  | 'CAMPAIGN'
  | 'BATTLE_CAMP'
  | 'ILLUMINATI'
  | 'DEALER'
  | 'SPAWN_MACHINE'
  | 'MERGE_HEROES'
  | 'RAID_BATTLE'
  | 'OPPONENT_CAMP_STEAL'
  | 'COMPLETED';

export const ONBOARDING_TIER_ORDER: readonly string[] = [
  'F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X'
];

export function getHighestRosterTier(roster: readonly SummonInstance[]): string {
  let highestIdx = 0;
  for (const s of roster) {
    const idx = ONBOARDING_TIER_ORDER.indexOf(s.tier);
    if (idx > highestIdx) {
      highestIdx = idx;
    }
  }
  return ONBOARDING_TIER_ORDER[highestIdx] ?? 'F';
}

export function isTierReached(currentTier: string, targetTier: string): boolean {
  const currentIdx = ONBOARDING_TIER_ORDER.indexOf(currentTier);
  const targetIdx = ONBOARDING_TIER_ORDER.indexOf(targetTier);
  return currentIdx >= targetIdx && targetIdx >= 0;
}

export class SilentOnboardingDirector {
  public phase: OnboardingPhase = 'CAMPAIGN';
  private idleTime: number = 0;
  private highlightRings: Entity[] = [];
  private ringMaterial: StandardMaterial | null = null;

  constructor(
    private app: Application,
    private events: PresentationEventEmitter,
    private sceneManager: SceneManager,
    private hud: HUDRoot,
    private tutorialHud: TutorialHUD,
    private worldLayer?: Layer
  ) {
    this.loadPersistedState();
    this.initMaterial();
    this.wireEvents();
    this.updatePresentation();
  }

  public loadPersistedState(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('psyblr_onboarding_phase');
        if (saved) {
          // Normalize legacy phase names
          if (saved === 'CAMPAIGN_BATTLE') this.phase = 'CAMPAIGN';
          else if (saved === 'CAMP_INVENTORY' || saved === 'SUMMON_INSPECT') this.phase = 'BATTLE_CAMP';
          else if (saved === 'PROTECT_ILLUMINATI') this.phase = 'ILLUMINATI';
          else if (saved === 'MEET_DEALER') this.phase = 'DEALER';
          else if (saved === 'EXPLORE_SPAWN') this.phase = 'SPAWN_MACHINE';
          else if (saved === 'MERGE_INTRO') this.phase = 'MERGE_HEROES';
          else if (saved === 'DEFENSE_PODIUM' || saved === 'EXPLORE_RAID') this.phase = 'RAID_BATTLE';
          else if (saved === 'OPPONENT_CAMP_STEAL') this.phase = 'OPPONENT_CAMP_STEAL';
          else if (saved === 'COMPLETED') this.phase = 'COMPLETED';
          else this.phase = saved as OnboardingPhase;
          return true;
        }
      }
    } catch {
      // Ignore
    }
    return false;
  }

  public saveState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('psyblr_onboarding_phase', this.phase);
      }
    } catch {
      // Ignore
    }
  }

  public reset(): void {
    this.phase = 'CAMPAIGN';
    this.idleTime = 0;
    this.clearHighlights();
    this.saveState();
    this.updatePresentation();
  }

  private initMaterial(): void {
    this.ringMaterial = new StandardMaterial();
    this.ringMaterial.diffuse = new Color(0.96, 0.62, 0.04);
    this.ringMaterial.emissive = new Color(0.96, 0.62, 0.04);
    this.ringMaterial.emissiveIntensity = 1.0;
    this.ringMaterial.opacity = 0.6;
    this.ringMaterial.blendType = 2; // BLEND_ADDITIVE
    this.ringMaterial.update();
  }

  private wireEvents(): void {
    this.events.on('summonGrabbed', () => {
      this.idleTime = 0;
    });

    this.tutorialHud.onActionClick = () => {
      this.handleContinueAction();
    };

    // Step 1 Campaign Victory handled via advanceTo('BATTLE_CAMP') in GameApp
    this.events.on('campaignWon', () => {
      if (this.phase === 'CAMPAIGN') {
        this.advanceTo('BATTLE_CAMP');
      }
    });

    // Step 3 Illuminati: Summon placed in Row 0 (cell.y === 0)
    this.events.on('summonPlaced', (data) => {
      if (this.phase === 'ILLUMINATI' && data.toCell.y === 0) {
        this.advanceTo('DEALER');
      }
    });

    // Step 4 Dealer: Medals collected
    this.events.on('dealerStockCollected', () => {
      if (this.phase === 'DEALER') {
        this.advanceTo('SPAWN_MACHINE');
      }
    });

    // Step 5 Spawn Machine: Spawn landed
    this.events.on('spawnLanded', () => {
      if (this.phase === 'SPAWN_MACHINE') {
        this.advanceTo('MERGE_HEROES');
      }
    });

    // Step 6 Merging: Track progress towards C tier
    this.events.on('mergeCompleted', () => {
      if (this.phase === 'MERGE_HEROES') {
        this.checkMergeProgress();
      }
    });

    // Step 7 Raid Battle: Raid won
    this.events.on('raidWon', () => {
      if (this.phase === 'RAID_BATTLE') {
        this.advanceTo('OPPONENT_CAMP_STEAL');
      }
    });

    // Step 8 Steal Completed
    this.events.on('stealCompleted', () => {
      if (this.phase === 'OPPONENT_CAMP_STEAL') {
        this.advanceTo('COMPLETED');
      }
    });
  }

  public checkMergeProgress(): void {
    const allInstances = [
      ...this.sceneManager.roster,
      ...this.sceneManager.summons.map((s) => s.instance),
    ];
    const highest = getHighestRosterTier(allInstances);
    if (isTierReached(highest, 'C')) {
      this.tutorialHud.updateObjective('✨ PROMOTED TO TIER C! Raid Arena Unlocked!', true);
      setTimeout(() => {
        if (this.phase === 'MERGE_HEROES') {
          this.advanceTo('RAID_BATTLE');
        }
      }, 500);
    } else {
      this.tutorialHud.updateObjective(
        `🎯 Current Highest: [Tier ${highest}]  •  Target: [Tier C]`,
        true
      );
    }
  }

  handleContinueAction(): void {
    switch (this.phase) {
      case 'CAMPAIGN':
        this.advanceTo('BATTLE_CAMP');
        break;
      case 'BATTLE_CAMP':
        this.advanceTo('ILLUMINATI');
        break;
      case 'ILLUMINATI':
        this.advanceTo('DEALER');
        break;
      case 'DEALER':
        this.advanceTo('SPAWN_MACHINE');
        break;
      case 'SPAWN_MACHINE':
        this.advanceTo('MERGE_HEROES');
        break;
      case 'MERGE_HEROES': {
        const highest = getHighestRosterTier(this.sceneManager.roster);
        if (isTierReached(highest, 'C')) {
          this.advanceTo('RAID_BATTLE');
        } else {
          this.advanceTo('RAID_BATTLE');
        }
        break;
      }
      case 'RAID_BATTLE':
        this.advanceTo('OPPONENT_CAMP_STEAL');
        break;
      case 'OPPONENT_CAMP_STEAL':
      case 'COMPLETED':
        this.phase = 'COMPLETED';
        this.saveState();
        this.tutorialHud.hide();
        break;
    }
  }

  advanceTo(phase: OnboardingPhase): void {
    this.phase = phase;
    this.idleTime = 0;
    this.clearHighlights();
    this.saveState();
    this.updatePresentation();
    this.events.emit('tutorialStepChanged', { phase: this.phase });
  }

  private clearHighlights(): void {
    for (const ring of this.highlightRings) {
      ring.destroy();
    }
    this.highlightRings = [];
  }

  private spawnAffordanceBeacon(x: number, y: number, z: number, scale: number = 1.3, layerOpt: any = {}): void {
    const ring = new Entity(`AffordanceBeacon_${x}_${z}`);
    ring.setPosition(x, y, z);
    ring.setLocalScale(scale, 0.02, scale);
    ring.addComponent('render', {
      type: 'cylinder',
      material: this.ringMaterial!,
      castShadows: false,
      ...layerOpt,
    });
    this.app.root.addChild(ring);
    this.highlightRings.push(ring);
  }

  public updatePresentation(): void {
    this.clearHighlights();
    const layerOpt = this.worldLayer ? { layers: [this.worldLayer.id] } : {};

    switch (this.phase) {
      case 'CAMPAIGN': {
        this.tutorialHud.showStepDetails({
          stepNumber: 1,
          totalSteps: 7,
          phaseName: 'CAMPAIGN',
          title: '1. Campaign Starter Squad',
          body: 'Deploy your starter heroes onto tactical cells, then tap START BATTLE. Combat in Psyblr is automatic and deterministic!',
          objective: '🎯 Objective: Deploy squad and win Campaign Level 1',
          actionLabel: 'CONTINUE →',
          accentColor: '#38bdf8',
        });
        break;
      }

      case 'BATTLE_CAMP': {
        this.tutorialHud.showStepDetails({
          stepNumber: 2,
          totalSteps: 7,
          phaseName: 'BATTLE CAMP',
          title: '2. Battle Camp Grid (6x6)',
          body: 'Your Battle Camp holds up to 36 Summons. Heroes in regular cells (Rows 1-5) can be challenged or exposed to rivals during raids.',
          objective: '🎯 Objective: Review your Battle Camp and press UNDERSTOOD',
          actionLabel: 'UNDERSTOOD →',
          accentColor: '#38bdf8',
        });
        break;
      }

      case 'ILLUMINATI': {
        this.tutorialHud.showStepDetails({
          stepNumber: 3,
          totalSteps: 7,
          phaseName: 'ILLUMINATI',
          title: '3. The Illuminati (Row 0 Protection)',
          body: 'Row 0 (the top Dais) provides 100% theft protection from rival raids! Drag any hero into Row 0 to protect them.',
          objective: '🎯 Objective: Drag any hero into Row 0 (Illuminati Dais)',
          actionLabel: 'CONTINUE →',
          accentColor: '#fbbf24',
        });

        // Highlight a summon in Rows 1-5 to encourage dragging to Row 0
        const gokus = this.sceneManager.summons.filter((s) => s.currentCell.y !== 0);
        for (const goku of gokus.slice(0, 1)) {
          const worldPos = campCellToWorld(goku.currentCell);
          this.spawnAffordanceBeacon(worldPos[0], 0.05, worldPos[2], 1.3, layerOpt);
        }
        break;
      }

      case 'DEALER': {
        this.tutorialHud.showStepDetails({
          stepNumber: 4,
          totalSteps: 7,
          phaseName: 'DEALER MEDALS',
          title: '4. Underground Medal Dealer',
          body: 'The Dealer generates Medals continuously (100 Medals per 24 hours). The Dealer has prepared 100 Medals for you! Tap the Dealer building to collect.',
          objective: '🎯 Objective: Tap the Dealer building and collect 100 Medals',
          actionLabel: 'OPEN DEALER →',
          accentColor: '#10b981',
        });
        this.spawnAffordanceBeacon(4.8, 0.05, 4.8, 2.2, layerOpt);
        break;
      }

      case 'SPAWN_MACHINE': {
        this.tutorialHud.showStepDetails({
          stepNumber: 5,
          totalSteps: 7,
          phaseName: 'SPAWN MACHINE',
          title: '5. Pachinko Spawn Machine',
          body: 'Spend 1 Medal per drop at the Spawn Machine to summon new F-tier heroes into your camp from today’s daily pool. Drop balls to summon reinforcements!',
          objective: '🎯 Objective: Drop balls at the Spawn Machine to summon new heroes',
          actionLabel: 'OPEN SPAWN →',
          accentColor: '#c084fc',
        });
        this.spawnAffordanceBeacon(6.4, 0.05, 0, 2.4, layerOpt);
        break;
      }

      case 'MERGE_HEROES': {
        const highest = getHighestRosterTier(this.sceneManager.roster);
        this.tutorialHud.showStepDetails({
          stepNumber: 6,
          totalSteps: 7,
          phaseName: 'MERGE HEROES',
          title: '6. Merge Heroes (F → E → D → C)',
          body: 'Drag duplicate heroes of the same tier onto each other to combine them (F+F=E, E+E=D, D+D=C). Use Medals at the Spawn Machine if you need more copies. Reach Tier C!',
          objective: `🎯 Current Highest: [Tier ${highest}]  •  Target: [Tier C]`,
          actionLabel: 'MERGE TO C →',
          accentColor: '#34d399',
        });

        // Highlight mergeable duplicate pairs
        const mergeableSummons = this.sceneManager.summons.filter((s) => {
          return this.sceneManager.summons.some(
            (other) => other.instance.id !== s.instance.id &&
                       other.instance.definitionId === s.instance.definitionId &&
                       other.instance.tier === s.instance.tier
          );
        });
        for (const s of mergeableSummons.slice(0, 4)) {
          const worldPos = campCellToWorld(s.currentCell);
          this.spawnAffordanceBeacon(worldPos[0], 0.05, worldPos[2], 1.3, layerOpt);
        }
        break;
      }

      case 'RAID_BATTLE': {
        this.tutorialHud.showStepDetails({
          stepNumber: 7,
          totalSteps: 7,
          phaseName: 'RAID ARENA',
          title: '7. PvP Raid Arena',
          body: 'Deploy your Tier C hero and squad in a timed 3-round PvP series against rival defense formations. Win at least 2 rounds to claim victory!',
          objective: '🎯 Objective: Enter Raid Gate and win the 3-round series',
          actionLabel: 'ENTER RAID →',
          accentColor: '#f87171',
        });
        this.spawnAffordanceBeacon(-6.4, 0.05, 0, 2.4, layerOpt);
        break;
      }

      case 'OPPONENT_CAMP_STEAL': {
        this.tutorialHud.showStepDetails({
          stepNumber: 7,
          totalSteps: 7,
          phaseName: 'OPPONENT CAMP',
          title: 'Stealing Exposed Heroes',
          body: 'Victory achieved! The opponent’s Row 0 Illuminati is protected, but you may tap any exposed hero in Rows 1-5 to steal into your Battle Camp!',
          objective: '🎯 Objective: Tap any exposed opponent hero to claim your reward',
          actionLabel: 'CLAIM HERO →',
          accentColor: '#fbbf24',
        });
        break;
      }

      case 'COMPLETED': {
        this.tutorialHud.showStepDetails({
          stepNumber: 7,
          totalSteps: 7,
          phaseName: 'COMPLETE',
          title: 'Tutorial Complete!',
          body: 'Congratulations! You have mastered Campaign, Battle Camp, Illuminati Dais, Dealer Medals, Spawn Machine, 10-Tier Merging, and PvP Raids!',
          objective: '✦ Mastery Achieved: World Unlocked',
          actionLabel: 'ENTER WORLD ✦',
          accentColor: '#38bdf8',
        });
        break;
      }
    }
  }

  update(dt: number): void {
    this.idleTime += dt;

    if (this.highlightRings.length > 0) {
      const pulse = 1.0 + Math.sin(this.idleTime * 4.0) * 0.15;
      for (const ring of this.highlightRings) {
        ring.setLocalScale(1.1 * pulse, 0.02, 1.1 * pulse);
      }
    }
  }

  destroy(): void {
    this.clearHighlights();
    if (this.ringMaterial) {
      this.ringMaterial.destroy();
    }
  }
}
