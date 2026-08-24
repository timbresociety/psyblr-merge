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

export type OnboardingPhase =
  | 'CAMPAIGN_INTRO'
  | 'PROTECT_ILLUMINATI'
  | 'MEET_DEALER'
  | 'EXPLORE_SPAWN'
  | 'MERGE_INTRO'
  | 'DEFENSE_PODIUM'
  | 'EXPLORE_RAID'
  | 'OPPONENT_CAMP_STEAL'
  | 'COMPLETED';

export class SilentOnboardingDirector {
  public phase: OnboardingPhase = 'CAMPAIGN_INTRO';
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
    this.initMaterial();
    this.wireEvents();
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

    this.events.on('summonPlaced', (data) => {
      if (this.phase === 'PROTECT_ILLUMINATI' && data.toCell.y === 0) {
        this.advanceTo('MEET_DEALER');
      }
    });

    this.events.on('mergeCompleted', () => {
      if (this.phase === 'MERGE_INTRO') {
        this.advanceTo('DEFENSE_PODIUM');
      }
    });

    this.events.on('spawnLanded', () => {
      if (this.phase === 'EXPLORE_SPAWN') {
        this.advanceTo('MERGE_INTRO');
      }
    });

    this.events.on('raidWon', () => {
      if (this.phase === 'EXPLORE_RAID') {
        this.advanceTo('OPPONENT_CAMP_STEAL');
      }
    });

    this.events.on('stealCompleted', () => {
      if (this.phase === 'OPPONENT_CAMP_STEAL') {
        this.advanceTo('COMPLETED');
      }
    });
  }

  handleContinueAction(): void {
    switch (this.phase) {
      case 'CAMPAIGN_INTRO':
        this.advanceTo('PROTECT_ILLUMINATI');
        break;
      case 'MEET_DEALER':
        this.advanceTo('EXPLORE_SPAWN');
        break;
      case 'DEFENSE_PODIUM':
        this.advanceTo('EXPLORE_RAID');
        break;
      case 'COMPLETED':
        this.tutorialHud.hide();
        break;
    }
  }

  advanceTo(phase: OnboardingPhase): void {
    this.phase = phase;
    this.idleTime = 0;
    this.clearHighlights();
    this.updatePresentation();
  }

  private clearHighlights(): void {
    for (const ring of this.highlightRings) {
      ring.destroy();
    }
    this.highlightRings = [];
  }

  public updatePresentation(): void {
    this.clearHighlights();
    const layerOpt = this.worldLayer ? { layers: [this.worldLayer.id] } : {};

    switch (this.phase) {
      case 'CAMPAIGN_INTRO': {
        this.hud.setSubtitle('✦ TUTORIAL 1/8: Campaign Battle Intro');
        this.tutorialHud.showStep(
          '1. Campaign Battles',
          'Deploy your 6 starter Summons into the field, toggle Auto-Cast, and watch the auto-battler fight to victory!',
          'CONTINUE →'
        );
        break;
      }

      case 'PROTECT_ILLUMINATI': {
        this.hud.setSubtitle('✦ TUTORIAL 2/8: The Illuminati Protection Dais');
        this.tutorialHud.showStep(
          '2. The Illuminati (Row 0)',
          'Your Battle Camp holds 36 Summons. Summons in ordinary cells can be stolen in raids. Drag a starter Summon into Row 0 (Illuminati) to protect it!'
        );

        // Highlight Row 0
        const gokus = this.sceneManager.summons.filter((s) => s.currentCell.y !== 0);
        for (const goku of gokus.slice(0, 1)) {
          const worldPos = campCellToWorld(goku.currentCell);
          const ring = new Entity(`AffordanceRing_${goku.instance.id}`);
          ring.setPosition(worldPos[0], 0.05, worldPos[2]);
          ring.setLocalScale(1.3, 0.02, 1.3);
          ring.addComponent('render', {
            type: 'cylinder',
            material: this.ringMaterial!,
            castShadows: false,
            ...layerOpt,
          });
          this.app.root.addChild(ring);
          this.highlightRings.push(ring);
        }
        break;
      }

      case 'MEET_DEALER': {
        this.hud.setSubtitle('✦ TUTORIAL 3/8: Meet The Dealer');
        this.tutorialHud.showStep(
          '3. Dealer (100 Daily Balls)',
          'The Dealer NPC in your base supplies 100 free Plinko balls every 24 hours. Tap Dealer to collect your daily balls!',
          'GOT IT →'
        );
        break;
      }

      case 'EXPLORE_SPAWN': {
        this.hud.setSubtitle('✦ TUTORIAL 4/8: Plinko Spawn Machine & Shields');
        this.tutorialHud.showStep(
          '4. Spawn Machine (Plinko)',
          'Tap the Spawn Machine to drop Plinko balls. Bouncing on side bumpers charges 1-hour Shields. Landing in bins dispenses new Summons!'
        );
        break;
      }

      case 'MERGE_INTRO': {
        this.hud.setSubtitle('✦ TUTORIAL 5/8: Tier Progression & Merging');
        this.tutorialHud.showStep(
          '5. Merging Summons (F → E → D → C)',
          'Combine identical duplicate Summons by dragging one onto the other. Watch their power multiplier and stats rise!'
        );

        // Find mergeable pair
        const gokus = this.sceneManager.summons.filter((s) => s.instance.definitionId === 'goku' && s.instance.tier === 'F');
        for (const goku of gokus) {
          const worldPos = campCellToWorld(goku.currentCell);
          const ring = new Entity(`AffordanceRing_${goku.instance.id}`);
          ring.setPosition(worldPos[0], 0.05, worldPos[2]);
          ring.setLocalScale(1.3, 0.02, 1.3);
          ring.addComponent('render', {
            type: 'cylinder',
            material: this.ringMaterial!,
            castShadows: false,
            ...layerOpt,
          });
          this.app.root.addChild(ring);
          this.highlightRings.push(ring);
        }
        break;
      }

      case 'DEFENSE_PODIUM': {
        this.hud.setSubtitle('✦ TUTORIAL 6/8: Defense Podium Setup');
        this.tutorialHud.showStep(
          '6. Defense Podium',
          'Inspect the Defense Podium to assign 2, 4, and 6 defenders to protect your camp when opponents attempt to raid you.',
          'CONTINUE →'
        );
        break;
      }

      case 'EXPLORE_RAID': {
        this.hud.setSubtitle('✦ TUTORIAL 7/8: 3-Round Raid Battles');
        this.tutorialHud.showStep(
          '7. Raid Arena',
          'Enter the Raid Gate! Fight against opponent defense across 3 sequential rounds: 2v2, 4v4, and 6v6. Win 2+ rounds to claim victory!'
        );
        break;
      }

      case 'OPPONENT_CAMP_STEAL': {
        this.hud.setSubtitle('✦ TUTORIAL 8/8: Opponent Camp Steal');
        this.tutorialHud.showStep(
          '8. Stealing Exposed Summons',
          'You won the raid! The opponent’s Illuminati Row 0 is locked, but any exposed Summon in Rows 1-5 can be stolen into your camp.'
        );
        break;
      }

      case 'COMPLETED': {
        this.hud.setSubtitle('BASE CAMP • FULL SANDBOX ACTIVE');
        this.tutorialHud.showStep(
          '✦ Tutorial Complete!',
          'Campaign progression (100-level Arcs, Bosses), Raid Battles, Dealer, Plinko Gacha, and Camp Merges are yours to explore!',
          'START PLAYING'
        );
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
