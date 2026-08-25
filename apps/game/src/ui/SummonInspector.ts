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
  getAllianceDefinition,
  getSkillDefinition,
} from '@psyblr/game-content';
import {
  resolveTierStats,
  nextTierStatDelta,
  nextTier,
  TIERS,
  resolveSummonPowerLevel,
  getReleaseRefund,
} from '@psyblr/game-rules';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import { colorFromHex } from '../presentation/ColorUtils';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export class SummonInspector {
  public root: Entity;
  public isOpen: boolean = false;
  public activeSummonId: string | null = null;
  public activeSummon: SummonInstance | null = null;

  private panelBg: Entity;
  private headerText: Entity;
  private subHeaderText: Entity;
  private badgesText: Entity;
  private quoteText: Entity;
  private descText: Entity;
  private statsText: Entity;
  private skillsText: Entity;
  private progressionText: Entity;
  private closeBtn: Entity;
  private releaseBtn: Entity;
  private releaseBtnText: Entity;

  private fontAsset: Asset;
  private onClosedCallback: (() => void) | null = null;
  private onReleaseCallback: ((summon: SummonInstance) => void) | null = null;

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
    this.root.addComponent('element', {
      type: 'group',
      anchor: [1, 0.5, 1, 0.5],
      pivot: [1, 0.5],
      width: 500,
      height: 740,
      ...layerOpt,
    });
    screenEntity.addChild(this.root);
    this.root.setLocalPosition(550, 0, 0);

    // 1. Panel Glassmorphism Backdrop (480x560) anchored to Right-Center
    this.panelBg = new Entity('InspectorBackdrop');
    this.panelBg.addComponent('element', {
      type: 'image',
      anchor: [1, 0.5, 1, 0.5],
      pivot: [1, 0.5],
      width: 480,
      height: 560,
      color: colorFromHex('#050a17'), // Deep Cyberpunk Navy
      opacity: 0.98,
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.panelBg);
    this.panelBg.setLocalPosition(-16, 0, 0);

    // Top Accent Border Bar (Luminous Cyan)
    const topBar = new Entity('TopAccentBar');
    topBar.addComponent('element', {
      type: 'image',
      anchor: [0, 1, 1, 1],
      pivot: [0, 1],
      width: 480,
      height: 4,
      color: colorFromHex('#38bdf8'),
      ...layerOpt,
    });
    this.panelBg.addChild(topBar);
    topBar.setLocalPosition(0, 0, 0);

    // Close Button [✕] (Top-Right)
    this.closeBtn = new Entity('CloseButton');
    this.closeBtn.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 20,
      text: '✕',
      color: colorFromHex('#94a3b8'),
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      useInput: true,
      ...layerOpt,
    });
    this.panelBg.addChild(this.closeBtn);
    this.closeBtn.setLocalPosition(-24, -18, 1);
    this.closeBtn.element?.on('click', () => this.close());

    // 2. Header Text (Title & Tier)
    this.headerText = new Entity('HeaderText');
    this.headerText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 22,
      text: 'SUMMON IDENTITY',
      color: new Color(1.0, 0.75, 0.1), // Bright Gold
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.headerText);
    this.headerText.setLocalPosition(24, -20, 1);

    // 3. SubHeader (Form Name & Alliance Badge)
    this.subHeaderText = new Entity('SubHeaderText');
    this.subHeaderText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'FORM • ALLIANCE',
      color: new Color(0.25, 0.8, 1.0), // Celestial Cyan
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.subHeaderText);
    this.subHeaderText.setLocalPosition(24, -48, 1);

    // 4. Badges (Power Level & Release Refund)
    this.badgesText = new Entity('BadgesText');
    this.badgesText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: 'POWER LEVEL: 0  •  RELEASE REFUND: 0 Medals',
      color: new Color(1.0, 0.85, 0.2),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.badgesText);
    this.badgesText.setLocalPosition(24, -70, 1);

    // 5. Quote & Lore Description
    this.quoteText = new Entity('QuoteText');
    this.quoteText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      lineHeight: 18,
      wrapLines: true,
      autoWidth: false,
      width: 432,
      text: '""',
      color: new Color(1.0, 1.0, 1.0),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.quoteText);
    this.quoteText.setLocalPosition(24, -94, 1);

    this.descText = new Entity('DescText');
    this.descText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 11,
      lineHeight: 16,
      wrapLines: true,
      autoWidth: false,
      width: 432,
      text: '',
      color: new Color(0.75, 0.82, 0.92),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.descText);
    this.descText.setLocalPosition(24, -136, 1);

    // 6. Core & Combat Stats
    this.statsText = new Entity('StatsText');
    this.statsText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      lineHeight: 18,
      wrapLines: true,
      autoWidth: false,
      width: 432,
      text: '',
      color: new Color(1.0, 1.0, 1.0),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.statsText);
    this.statsText.setLocalPosition(24, -178, 1);

    // 7. 5-Skill Combat Kit
    this.skillsText = new Entity('SkillsText');
    this.skillsText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      lineHeight: 18,
      wrapLines: true,
      autoWidth: false,
      width: 432,
      text: '',
      color: new Color(1.0, 1.0, 1.0),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.skillsText);
    this.skillsText.setLocalPosition(24, -282, 1);

    // 8. 10-Tier Progression Rail
    this.progressionText = new Entity('ProgressionText');
    this.progressionText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      lineHeight: 18,
      wrapLines: true,
      autoWidth: false,
      width: 432,
      text: '',
      color: new Color(1.0, 0.85, 0.2),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.panelBg.addChild(this.progressionText);
    this.progressionText.setLocalPosition(24, -395, 1);

    // 9. High-Contrast Release Button (Bottom)
    this.releaseBtn = new Entity('ReleaseButton');
    this.releaseBtn.addComponent('element', {
      type: 'image',
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      width: 432,
      height: 44,
      color: colorFromHex('#dc2626'), // Bright Crimson Red
      useInput: true,
      ...layerOpt,
    });
    this.panelBg.addChild(this.releaseBtn);
    this.releaseBtn.setLocalPosition(24, -480, 1);

    // Top border trim on button
    const releaseTrim = new Entity('ReleaseBtnTrim');
    releaseTrim.addComponent('element', {
      type: 'image',
      anchor: [0, 1, 1, 1],
      pivot: [0, 1],
      width: 432,
      height: 2,
      color: colorFromHex('#fca5a5'), // Bright Red/Pink Accent
      ...layerOpt,
    });
    this.releaseBtn.addChild(releaseTrim);
    releaseTrim.setLocalPosition(0, 0, 1);

    this.releaseBtnText = new Entity('ReleaseBtnText');
    this.releaseBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'RELEASE SUMMON',
      color: new Color(1, 1, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.releaseBtn.addChild(this.releaseBtnText);
    this.releaseBtnText.setLocalPosition(0, 0, 1);

    this.releaseBtn.element?.on('click', () => {
      if (this.activeSummon && this.onReleaseCallback) {
        this.onReleaseCallback(this.activeSummon);
      }
    });

    // ESC key listener to dismiss
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  public setOnRelease(callback: (summon: SummonInstance) => void): void {
    this.onReleaseCallback = callback;
  }

  populateData(summon: SummonInstance): void {
    this.activeSummonId = summon.id;
    this.activeSummon = summon;
    const def = getSummonDefinition(summon.definitionId);
    const alliance = getAllianceDefinition(def.allianceId);
    const tier = summon.tier;
    const stats = resolveTierStats(def.stats, tier);
    const delta = nextTierStatDelta(def.stats, tier);
    const next = nextTier(tier);
    const powerLevel = resolveSummonPowerLevel(def, tier);
    const refund = getReleaseRefund(tier);
    const formName: string = (def.formsByTier && def.formsByTier[tier]) ? String(def.formsByTier[tier]) : `${tier}-Tier Form`;

    // 1. Header & Badges
    if (this.headerText.element) {
      this.headerText.element.text = `${def.displayName.toUpperCase()}  [TIER ${tier}]`;
    }
    if (this.subHeaderText.element) {
      this.subHeaderText.element.text = `${formName.toUpperCase()}  •  ${alliance.name.toUpperCase()} ALLIANCE`;
    }
    if (this.badgesText.element) {
      this.badgesText.element.text = `⚡ POWER LEVEL: ${powerLevel}  •  💰 REFUND: ${refund} Medals`;
    }

    // 2. Quote & Description
    if (this.quoteText.element) {
      this.quoteText.element.text = `"${def.quote}"`;
    }
    if (this.descText.element) {
      this.descText.element.text = def.description;
    }

    // 3. Stats
    if (this.statsText.element) {
      this.statsText.element.text = [
        `[ CORE & COMBAT STATS - TIER ${tier} ]`,
        `HP: ${stats.hp}    ATK: ${stats.atk}    DEF: ${stats.def}`,
        `APS: ${stats.attacksPerSecond.toFixed(2)}    RANGE: ${stats.range.toFixed(1)}    MOVE: ${stats.moveSpeed.toFixed(1)}`,
        `CRIT: ${((def.stats.critChance ?? 0.05) * 100).toFixed(0)}% (${(def.stats.critDamage ?? 1.5).toFixed(1)}x)    BLOCK: ${((def.stats.blockChance ?? 0) * 100).toFixed(0)}%    DODGE: ${((def.stats.dodgeChance ?? 0) * 100).toFixed(0)}%`,
        `SKILL PWR: ${def.stats.skillPower ?? 100}%    CDR: ${((def.stats.cooldownReduction ?? 0) * 100).toFixed(0)}%    DRAIN: ${((def.stats.drain ?? 0) * 100).toFixed(0)}%`,
      ].join('\n');
    }

    // 4. Skills
    const basicDef = getSkillDefinition(def.skills.basic);
    const skill1Def = getSkillDefinition(def.skills.skill1);
    const skill2Def = def.skills.skill2 ? getSkillDefinition(def.skills.skill2) : null;
    const ultDef = def.skills.ultimate ? getSkillDefinition(def.skills.ultimate) : null;
    const passiveDef = def.passiveId ? getSkillDefinition(def.passiveId) : null;

    if (this.skillsText.element) {
      this.skillsText.element.color = new Color(1, 1, 1);
      this.skillsText.element.text = [
        `[ 5-SKILL COMBAT KIT ]`,
        `• Passive: ${passiveDef ? passiveDef.name : 'None'}`,
        `• Basic: ${basicDef.name}`,
        `• Skill 1: ${skill1Def.name} (${skill1Def.mechanics ? `${(skill1Def.mechanics.cooldownMs / 1000).toFixed(1)}s CD` : 'Ready'})`,
        `• Skill 2: ${skill2Def ? skill2Def.name : 'None'}`,
        `• Ultimate: ${ultDef ? ultDef.name : 'None'}`,
      ].join('\n');
    }

    // 5. Progression Rail
    const railNodes = TIERS.map((t) => (t === tier ? `[${t}]` : t)).join(' - ');
    const nextUpgradeLine = next && delta
      ? `Next [Tier ${next}]: +${delta.hp} HP  +${delta.atk} ATK  +${delta.def} DEF`
      : `MAX TIER REACHED [Mythic X]`;

    if (this.progressionText.element) {
      this.progressionText.element.color = new Color(1.0, 0.85, 0.2);
      this.progressionText.element.text = [
        `[ 10-TIER PROGRESSION RAIL ]`,
        `${railNodes}`,
        `${nextUpgradeLine}`,
      ].join('\n');
    }

    // 6. Release Button Text
    if (this.releaseBtn.element) {
      this.releaseBtn.element.color = colorFromHex('#dc2626');
    }
    if (this.releaseBtnText.element) {
      this.releaseBtnText.element.color = new Color(1, 1, 1);
      this.releaseBtnText.element.text = `RELEASE SUMMON (+${refund} MEDALS)`;
    }
  }

  open(
    summon: SummonInstance,
    onClosed?: () => void,
    options?: { allowRelease?: boolean }
  ): void {
    this.populateData(summon);
    this.onClosedCallback = onClosed ?? null;

    const allowRelease = options?.allowRelease ?? true;
    if (this.releaseBtn) {
      this.releaseBtn.enabled = allowRelease;
    }

    if (!this.isOpen) {
      this.isOpen = true;
      this.root.enabled = true;
      this.audio.playInspectorOpen();

      // Slide-in animation from right edge
      this.motion.tween({
        id: 'inspector_slide',
        from: 550,
        to: 0,
        duration: DURATION.QUICK,
        easing: EASING.SNAP,
        onUpdate: (x) => {
          this.root.setLocalPosition(x, 0, 0);
        },
      });
    }
  }

  close(suppressCallback: boolean = false): void {
    if (!this.isOpen && !this.root.enabled) return;
    this.isOpen = false;
    this.activeSummonId = null;
    this.activeSummon = null;
    const cb = suppressCallback ? null : this.onClosedCallback;
    this.onClosedCallback = null;
    this.audio.playInspectorClose();

    if (suppressCallback) {
      this.motion.cancel('inspector_slide');
      this.root.setLocalPosition(550, 0, 0);
      this.root.enabled = false;
      return;
    }

    // Slide-out animation
    this.motion.tween({
      id: 'inspector_slide',
      from: this.root.getLocalPosition().x,
      to: 550,
      duration: DURATION.QUICK,
      easing: EASING.SNAP,
      onUpdate: (x) => {
        this.root.setLocalPosition(x, 0, 0);
      },
      onComplete: () => {
        this.root.enabled = false;
        if (cb) {
          cb();
        }
      },
    });
  }

  destroy(): void {
    this.motion.cancel('inspector_slide');
    this.root.destroy();
  }
}
