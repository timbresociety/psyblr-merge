import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import type { SummonInstance } from '@psyblr/contracts';
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
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export class SummonInspector {
  public root: Entity;
  public isOpen: boolean = false;
  public activeSummonId: string | null = null;
  public activeSummon: SummonInstance | null = null;

  private panelBg: Entity;
  private headerText: Entity;
  private bodyText: Entity;
  private closeBtn: Entity;

  private fontAsset: Asset;
  private onClosedCallback: (() => void) | null = null;

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private audio: AudioDirector,
    fontAsset: Asset,
    screenEntity: Entity,
    private hudLayer?: Layer
  ) {
    this.fontAsset = fontAsset;
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    // Root Container Entity
    this.root = new Entity('SummonInspector_Panel');
    this.root.enabled = false;
    this.root.setLocalPosition(500, 0, 0);
    screenEntity.addChild(this.root);

    // 1. Panel Glassmorphism Backdrop (440x640) anchored to Right-Center
    this.panelBg = new Entity('InspectorBackdrop');
    this.panelBg.setLocalPosition(-24, 0, 0);
    this.panelBg.addComponent('element', {
      type: 'image',
      anchor: [1, 0.5, 1, 0.5],
      pivot: [1, 0.5],
      width: 440,
      height: 640,
      color: new Color(0.04, 0.07, 0.15), // Deep navy
      opacity: 0.94,
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.panelBg);

    // Top Accent Border Bar (Amber Gold)
    const topBar = new Entity('TopAccentBar');
    topBar.setLocalPosition(0, 0, 0);
    topBar.addComponent('element', {
      type: 'image',
      anchor: [0, 1, 1, 1], // Stretch horizontally at top
      pivot: [0, 1],
      width: 440,
      height: 4,
      color: new Color(0.96, 0.62, 0.04),
      ...layerOpt,
    });
    this.panelBg.addChild(topBar);

    // 2. Header Text (Top-Left inside panel)
    this.headerText = new Entity('HeaderText');
    this.headerText.setLocalPosition(24, -38, 0);
    this.headerText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 22,
      text: 'SUMMON IDENTITY',
      color: new Color(0.96, 0.62, 0.04), // Amber gold
      anchor: [0, 1, 0, 1], // Top-Left of parent
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.headerText);

    // Close Button [X] (Top-Right inside panel)
    this.closeBtn = new Entity('CloseButton');
    this.closeBtn.setLocalPosition(-24, -38, 0);
    this.closeBtn.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 20,
      text: 'X',
      color: new Color(0.6, 0.7, 0.8),
      anchor: [1, 1, 1, 1], // Top-Right of parent
      pivot: [1, 1],
      useInput: true,
      ...layerOpt,
    });
    this.closeBtn.element?.on('click', () => this.close());
    this.panelBg.addChild(this.closeBtn);

    // 3. Unified Formatted Body Text Container
    this.bodyText = new Entity('BodyText');
    this.bodyText.setLocalPosition(24, -80, 0);
    this.bodyText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      lineHeight: 20,
      wrapLines: true,
      width: 392,
      text: 'Loading...',
      color: new Color(0.92, 0.94, 0.98),
      anchor: [0, 1, 0, 1], // Top-Left of parent
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.bodyText);

    // ESC key listener to dismiss
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  populateData(summon: SummonInstance): void {
    this.activeSummonId = summon.id;
    this.activeSummon = summon;
    const def = getSummonDefinition(summon.definitionId);
    const origin = getOriginDefinition(def.originId);
    const fn = getCombatFunctionDefinition(def.combatFunctionId);
    const tier = summon.tier;
    const stats = resolveTierStats(def.stats, tier);
    const delta = nextTierStatDelta(def.stats, tier);
    const next = nextTier(tier);
    const mult = TIER_MULTIPLIER[tier].toFixed(2);

    if (this.headerText.element) {
      this.headerText.element.text = `${def.displayName.toUpperCase()}  [${tier}]`;
    }

    const basicDef = getSkillDefinition(def.skills.basic);
    const skill1Def = getSkillDefinition(def.skills.skill1);
    const skill2Def = def.skills.skill2 ? getSkillDefinition(def.skills.skill2) : null;
    const ultDef = def.skills.ultimate ? getSkillDefinition(def.skills.ultimate) : null;

    const railNodes = TIERS.map((t) => (t === tier ? `[${t}]` : t)).join(' - ');
    const nextUpgradeLine = next && delta
      ? `Next [Tier ${next}]: +${delta.hp} HP  +${delta.atk} ATK  +${delta.def} DEF`
      : `MAX TIER REACHED [Mythic SSS]`;

    const formattedLines = [
      `${origin.name.toUpperCase()}  •  ${fn.name.toUpperCase()}  •  POWER ${mult}x`,
      ``,
      `${def.summary}`,
      ``,
      `[CORE STATS - TIER ${tier}]`,
      `HP: ${stats.hp}    ATK: ${stats.atk}    DEF: ${stats.def}`,
      `APS: ${stats.attacksPerSecond.toFixed(2)}    RANGE: ${stats.range.toFixed(1)}    MOVE: ${stats.moveSpeed.toFixed(1)}`,
      ``,
      `[ABILITIES]`,
      `• Basic: ${basicDef.name} (Active)`,
      `• Skill 1: ${skill1Def.name} (${skill1Def.mechanics ? `${(skill1Def.mechanics.cooldownMs / 1000).toFixed(1)}s CD` : 'Ready'})`,
      `• Skill 2: ${skill2Def ? skill2Def.name : 'LOCKED (Tier D)'}`,
      `• Ultimate: ${ultDef ? ultDef.name : 'LOCKED (Tier A)'}`,
      ``,
      `[PROGRESSION RAIL]`,
      `${railNodes}`,
      `${nextUpgradeLine}`,
    ];

    if (this.bodyText.element) {
      this.bodyText.element.text = formattedLines.join('\n');
    }
  }

  open(summon: SummonInstance, onClosed?: () => void): void {
    this.populateData(summon);
    this.onClosedCallback = onClosed ?? null;

    if (!this.isOpen) {
      this.isOpen = true;
      this.root.enabled = true;
      this.audio.playInspectorOpen();

      // Slide-in animation from right edge
      this.motion.tween({
        id: 'inspector_slide',
        from: 500,
        to: 0,
        duration: DURATION.QUICK,
        easing: EASING.SNAP,
        onUpdate: (x) => {
          this.root.setLocalPosition(x, 0, 0);
        },
      });
    }
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.activeSummonId = null;
    this.activeSummon = null;
    this.audio.playInspectorClose();

    // Slide-out animation
    this.motion.tween({
      id: 'inspector_slide',
      from: this.root.getLocalPosition().x,
      to: 500,
      duration: DURATION.QUICK,
      easing: EASING.SNAP,
      onUpdate: (x) => {
        this.root.setLocalPosition(x, 0, 0);
      },
      onComplete: () => {
        this.root.enabled = false;
        if (this.onClosedCallback) {
          const cb = this.onClosedCallback;
          this.onClosedCallback = null;
          cb();
        }
      },
    });
  }

  destroy(): void {
    this.root.destroy();
  }
}
