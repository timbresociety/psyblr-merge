import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { CampaignArc } from '../campaign/CampaignController';
import type { SummonInstance } from '@psyblr/contracts';
import { getSummonDefinition } from '@psyblr/game-content';
import { resolveSummonPowerLevel, TIERS } from '@psyblr/game-rules';

export class CampaignHUD {
  public root: Entity;
  public isOpen: boolean = false;

  private topBar: Entity;
  private titleText: Entity;
  private statusText: Entity;
  private closeBtn: Entity;
  private squadTray: Entity;
  private autoCastBtn: Entity;
  private autoCastText: Entity;
  private startBtn: Entity;
  private startBtnText: Entity;
  private withdrawBtn: Entity;
  private autoDeployBtn: Entity;

  // Victory / Defeat Modal
  private resultModal: Entity;
  private resultTrim: Entity;
  private resultTitle: Entity;
  private resultRewardText: Entity;
  private nextLevelBtn: Entity;
  private returnCampBtn: Entity;

  public autoCast: boolean = true;
  public isCombatActive: boolean = false;
  private currentRoster: readonly SummonInstance[] = [];
  private deployedSummonIds: Set<string> = new Set();
  public pageIndex: number = 0;
  private readonly CARDS_PER_PAGE: number = 6;
  private lastPlacements?: readonly { summonId: string; cell: { x: number; z: number } }[] | undefined;

  public onStartBattle?: () => void;
  public onNextLevel?: () => void;
  public onClose?: () => void;
  public onToggleAutoCast?: (auto: boolean) => void;
  public onToggleDeploy?: (summon: SummonInstance) => void;
  public onCardDragStart?: (summon: SummonInstance, clientX: number, clientY: number) => void;
  public onWithdrawAll?: () => void;
  public onAutoDeploy?: () => void;

  constructor(
    private app: Application,
    private audio: AudioDirector,
    private fontAsset: Asset,
    screenEntity: Entity,
    private hudLayer?: Layer
  ) {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    this.root = new Entity('CampaignHUD_Root');
    this.root.enabled = false;
    screenEntity.addChild(this.root);
    this.root.setLocalPosition(0, 0, 0);

    // 1. Top Header Bar
    this.topBar = new Entity('CampaignTopBar');
    this.topBar.addComponent('element', {
      type: 'group',
      anchor: [0, 1, 1, 1],
      pivot: [0, 1],
      height: 80,
      ...layerOpt,
    });
    this.root.addChild(this.topBar);
    this.topBar.setLocalPosition(0, 0, 0);

    this.titleText = new Entity('CampaignTitle');
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 20,
      text: 'CAMPAIGN • ARC 1: AWAKENING (LEVEL 1)',
      color: colorFromHex('#38bdf8'), // Celestial Cyan
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.topBar.addChild(this.titleText);
    this.titleText.setLocalPosition(32, -24, 0);

    this.statusText = new Entity('CampaignStatus');
    this.statusText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'SQUAD: 6/6 DEPLOYED • SELECT & POSITION SUMMONS',
      color: colorFromHex('#f8fafc'),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.topBar.addChild(this.statusText);
    this.statusText.setLocalPosition(32, -54, 0);

    // [RETURN TO BASE] Button Top-Right
    this.closeBtn = new Entity('CampBackButton');
    this.closeBtn.addComponent('element', {
      type: 'image',
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      width: 180,
      height: 38,
      color: colorFromHex('#0f172a'),
      useInput: true,
      ...layerOpt,
    });
    this.topBar.addChild(this.closeBtn);
    this.closeBtn.setLocalPosition(-32, -24, 0);

    const closeTrim = new Entity('CampBackTrim');
    closeTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 176,
      height: 2,
      color: colorFromHex('#38bdf8'),
      ...layerOpt,
    });
    this.closeBtn.addChild(closeTrim);
    closeTrim.setLocalPosition(0, 18, 0);

    const closeText = new Entity('CampBackText');
    closeText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '← RETURN TO BASE',
      color: colorFromHex('#f8fafc'),
      autoWidth: false,
      autoHeight: false,
      width: 180,
      height: 38,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.closeBtn.addChild(closeText);
    closeText.setLocalPosition(0, 0, 0);

    this.closeBtn.element?.on('click', () => this.close());
    this.closeBtn.element?.on('touchend', () => this.close());

    // 2. Bottom Squad Deployment Bar
    this.squadTray = new Entity('CampaignSquadTray');
    this.squadTray.addComponent('element', {
      type: 'group',
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0],
      width: 680,
      height: 64,
      ...layerOpt,
    });
    this.root.addChild(this.squadTray);
    this.squadTray.setLocalPosition(0, 50, 0);

    // 3. Auto Progress Toggle (Bottom-Left)
    this.autoCastBtn = new Entity('AutoProgressBtn');
    this.autoCastBtn.addComponent('element', {
      type: 'image',
      anchor: [0, 0, 0, 0],
      pivot: [0, 0],
      width: 180,
      height: 48,
      color: colorFromHex('#0c2040'),
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.autoCastBtn);
    this.autoCastBtn.setLocalPosition(48, 50, 0);

    const autoTrim = new Entity('AutoProgressTrim');
    autoTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 176,
      height: 2,
      color: colorFromHex('#0284c7'),
      ...layerOpt,
    });
    this.autoCastBtn.addChild(autoTrim);
    autoTrim.setLocalPosition(0, 23, 0);

    this.autoCastText = new Entity('AutoProgressText');
    this.autoCastText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: 'AUTO PROGRESS: [ON]',
      color: colorFromHex('#e0f2fe'),
      autoWidth: false,
      autoHeight: false,
      width: 180,
      height: 48,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.autoCastBtn.addChild(this.autoCastText);
    this.autoCastText.setLocalPosition(0, 0, 0);

    this.autoCastBtn.element?.on('click', () => {
      this.autoCast = !this.autoCast;
      if (this.autoCastText.element) {
        this.autoCastText.element.text = `AUTO PROGRESS: [${this.autoCast ? 'ON' : 'OFF'}]`;
      }
      this.onToggleAutoCast?.(this.autoCast);
    });

    // 4. [START BATTLE] Button (Bottom-Right)
    this.startBtn = new Entity('StartCampBattleBtn');
    this.startBtn.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0],
      pivot: [1, 0],
      width: 220,
      height: 48,
      color: colorFromHex('#0284c7'),
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.startBtn);
    this.startBtn.setLocalPosition(-48, 50, 0);

    const startTrim = new Entity('StartCampTrim');
    startTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 216,
      height: 2,
      color: colorFromHex('#38bdf8'),
      ...layerOpt,
    });
    this.startBtn.addChild(startTrim);
    startTrim.setLocalPosition(0, 23, 0);

    this.startBtnText = new Entity('StartCampBtnText');
    this.startBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'START BATTLE ⚔️',
      color: new Color(1, 1, 1),
      autoWidth: false,
      autoHeight: false,
      width: 220,
      height: 48,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.startBtn.addChild(this.startBtnText);
    this.startBtnText.setLocalPosition(0, 0, 0);

    this.startBtn.element?.on('click', () => {
      if (this.isCombatActive) return;
      this.onStartBattle?.();
    });
    this.startBtn.element?.on('touchend', () => {
      if (this.isCombatActive) return;
      this.onStartBattle?.();
    });

    // 5. Squad Quick Management Action Buttons (Above Squad Tray)
    // [ ↺ WITHDRAW ALL ]
    this.withdrawBtn = new Entity('CampaignWithdrawBtn');
    this.withdrawBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0],
      width: 150,
      height: 32,
      color: colorFromHex('#1e1215'),
      opacity: 0.95,
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.withdrawBtn);
    this.withdrawBtn.setLocalPosition(-240, 118, 0);

    const withdrawTrim = new Entity('WithdrawTrim');
    withdrawTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 146,
      height: 2,
      color: colorFromHex('#f87171'),
      ...layerOpt,
    });
    this.withdrawBtn.addChild(withdrawTrim);
    withdrawTrim.setLocalPosition(0, 15, 0);

    const withdrawText = new Entity('WithdrawText');
    withdrawText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 11,
      text: '↺ WITHDRAW ALL',
      color: colorFromHex('#fca5a5'),
      autoWidth: false,
      autoHeight: false,
      width: 150,
      height: 32,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.withdrawBtn.addChild(withdrawText);
    withdrawText.setLocalPosition(0, 0, 0);

    this.withdrawBtn.element?.on('click', () => {
      if (this.isCombatActive) return;
      this.onWithdrawAll?.();
    });
    this.withdrawBtn.element?.on('touchend', () => {
      if (this.isCombatActive) return;
      this.onWithdrawAll?.();
    });

    // [ ⚡ AUTO DEPLOY ]
    this.autoDeployBtn = new Entity('CampaignAutoDeployBtn');
    this.autoDeployBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0],
      width: 150,
      height: 32,
      color: colorFromHex('#0c2040'),
      opacity: 0.95,
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.autoDeployBtn);
    this.autoDeployBtn.setLocalPosition(240, 118, 0);

    const autoDeployTrim = new Entity('AutoDeployTrim');
    autoDeployTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 146,
      height: 2,
      color: colorFromHex('#fbbf24'),
      ...layerOpt,
    });
    this.autoDeployBtn.addChild(autoDeployTrim);
    autoDeployTrim.setLocalPosition(0, 15, 0);

    const autoDeployText = new Entity('AutoDeployText');
    autoDeployText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 11,
      text: '⚡ AUTO DEPLOY',
      color: colorFromHex('#fef08a'),
      autoWidth: false,
      autoHeight: false,
      width: 150,
      height: 32,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.autoDeployBtn.addChild(autoDeployText);
    autoDeployText.setLocalPosition(0, 0, 0);

    this.autoDeployBtn.element?.on('click', () => {
      if (this.isCombatActive) return;
      this.onAutoDeploy?.();
    });
    this.autoDeployBtn.element?.on('touchend', () => {
      if (this.isCombatActive) return;
      this.onAutoDeploy?.();
    });

    // 6. Victory / Defeat Modal (Centered, Structured & Spaced)
    this.resultModal = new Entity('CampaignResultModal');
    this.resultModal.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 560,
      height: 340,
      color: colorFromHex('#060e20'),
      opacity: 0.98,
      useInput: true,
      ...layerOpt,
    });
    this.resultModal.enabled = false;
    this.root.addChild(this.resultModal);
    this.resultModal.setLocalPosition(0, 0, 0);

    this.resultTrim = new Entity('ResultTrim');
    this.resultTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 1, 0.5, 1],
      pivot: [0.5, 1],
      width: 560,
      height: 4,
      color: colorFromHex('#22c55e'),
      ...layerOpt,
    });
    this.resultModal.addChild(this.resultTrim);
    this.resultTrim.setLocalPosition(0, 0, 1);

    this.resultTitle = new Entity('ResultTitle');
    this.resultTitle.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 24,
      text: 'VICTORY!',
      color: colorFromHex('#22c55e'),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.resultModal.addChild(this.resultTitle);
    this.resultTitle.setLocalPosition(0, 100, 1);

    this.resultRewardText = new Entity('ResultReward');
    this.resultRewardText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 16,
      text: '+2 MEDALS EARNED (メダル)',
      color: colorFromHex('#fde047'),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.resultModal.addChild(this.resultRewardText);
    this.resultRewardText.setLocalPosition(0, 45, 1);

    this.nextLevelBtn = new Entity('NextLevelBtn');
    this.nextLevelBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 280,
      height: 46,
      color: colorFromHex('#0284c7'),
      useInput: true,
      ...layerOpt,
    });
    this.resultModal.addChild(this.nextLevelBtn);
    this.nextLevelBtn.setLocalPosition(0, -25, 1);

    const nextTrim = new Entity('NextTrim');
    nextTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 1, 0.5, 1],
      pivot: [0.5, 1],
      width: 276,
      height: 2,
      color: colorFromHex('#38bdf8'),
      ...layerOpt,
    });
    this.nextLevelBtn.addChild(nextTrim);
    nextTrim.setLocalPosition(0, 0, 1);

    const nextText = new Entity('NextBtnText');
    nextText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'NEXT LEVEL →',
      color: new Color(1, 1, 1),
      autoWidth: false,
      autoHeight: false,
      width: 280,
      height: 46,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.nextLevelBtn.addChild(nextText);
    nextText.setLocalPosition(0, 0, 1);

    this.nextLevelBtn.element?.on('click', () => {
      this.resultModal.enabled = false;
      this.onNextLevel?.();
    });

    this.returnCampBtn = new Entity('ReturnCampBtn');
    this.returnCampBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 280,
      height: 40,
      color: colorFromHex('#1e293b'),
      useInput: true,
      ...layerOpt,
    });
    this.resultModal.addChild(this.returnCampBtn);
    this.returnCampBtn.setLocalPosition(0, -85, 1);

    const retModalText = new Entity('ReturnModalText');
    retModalText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '← RETURN TO BASE CAMP',
      color: colorFromHex('#f8fafc'),
      autoWidth: false,
      autoHeight: false,
      width: 280,
      height: 40,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.returnCampBtn.addChild(retModalText);
    retModalText.setLocalPosition(0, 0, 1);

    this.returnCampBtn.element?.on('click', () => {
      this.resultModal.enabled = false;
      this.close();
    });

    // ESC key listener to exit
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  private getEventCoordinates(e: any): { x: number; y: number } {
    if (e.event && typeof e.event.clientX === 'number') {
      return { x: e.event.clientX, y: e.event.clientY };
    }
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      return { x: touch.clientX ?? e.x, y: touch.clientY ?? e.y };
    }
    return { x: e.x ?? 0, y: e.y ?? 0 };
  }

  setCombatActive(active: boolean): void {
    this.isCombatActive = active;
    if (this.withdrawBtn.element) {
      this.withdrawBtn.element.useInput = !active;
      this.withdrawBtn.element.opacity = active ? 0.4 : 0.95;
    }
    if (this.autoDeployBtn.element) {
      this.autoDeployBtn.element.useInput = !active;
      this.autoDeployBtn.element.opacity = active ? 0.4 : 0.95;
    }
    if (this.startBtn.element) {
      this.startBtn.element.useInput = !active;
      this.startBtn.element.opacity = active ? 0.5 : 1.0;
    }
    if (this.startBtnText.element) {
      if (active) {
        this.startBtnText.element.text = 'BATTLE ACTIVE ⚔️';
      } else {
        const deployedCount = this.deployedSummonIds.size;
        this.startBtnText.element.text = deployedCount > 0 ? `START BATTLE ⚔️ (${deployedCount}/6)` : 'SELECT SQUAD (0/6)';
      }
    }
    this.renderSquadCards();
  }

  setRoster(
    roster: readonly SummonInstance[],
    deployedIds: readonly string[],
    placements?: readonly { summonId: string; cell: { x: number; z: number } }[]
  ): void {
    const sorted = [...roster].sort((a, b) => {
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

    this.currentRoster = sorted;
    this.deployedSummonIds = new Set(deployedIds);
    this.lastPlacements = placements;
    this.renderSquadCards();
  }

  private renderSquadCards(): void {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    // Clear previous cards
    const children = [...this.squadTray.children];
    for (const child of children) {
      child.destroy();
    }

    const totalRoster = this.currentRoster.length;
    const totalPages = Math.max(1, Math.ceil(totalRoster / this.CARDS_PER_PAGE));
    this.pageIndex = Math.max(0, Math.min(this.pageIndex, totalPages - 1));

    const startIndex = this.pageIndex * this.CARDS_PER_PAGE;
    const pageSummons = this.currentRoster.slice(startIndex, startIndex + this.CARDS_PER_PAGE);

    const cardWidth = 100;
    const cardGap = 8;
    const count = pageSummons.length;
    const totalW = count * cardWidth + (count - 1) * cardGap;
    const startX = -totalW / 2 + cardWidth / 2;

    // Previous Page Button if multiple pages
    if (totalPages > 1) {
      const prevBtn = new Entity('PrevPageBtn');
      prevBtn.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: 32,
        height: 56,
        color: this.pageIndex > 0 ? colorFromHex('#0f172a') : colorFromHex('#080d1a'),
        opacity: this.pageIndex > 0 ? 0.95 : 0.4,
        useInput: this.pageIndex > 0,
        ...layerOpt,
      });
      this.squadTray.addChild(prevBtn);
      prevBtn.setLocalPosition(startX - cardWidth / 2 - 24, 0, 0);

      const prevText = new Entity('PrevText');
      prevText.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 16,
        text: '◀',
        color: this.pageIndex > 0 ? colorFromHex('#38bdf8') : colorFromHex('#475569'),
        alignment: [0.5, 0.5],
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      prevBtn.addChild(prevText);
      prevText.setLocalPosition(0, 0, 0);

      if (this.pageIndex > 0) {
        prevBtn.element?.on('click', () => {
          this.pageIndex--;
          this.renderSquadCards();
        });
      }
    }

    for (let i = 0; i < count; i++) {
      const summon = pageSummons[i]!;
      const def = getSummonDefinition(summon.definitionId);
      const isDeployed = this.deployedSummonIds.has(summon.id);
      const pwr = resolveSummonPowerLevel(def, summon.tier);
      const placement = this.lastPlacements?.find((p) => p.summonId === summon.id);

      const card = new Entity(`SquadCard_${summon.id}`);
      card.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: cardWidth,
        height: 56,
        color: isDeployed ? colorFromHex('#064e3b') : colorFromHex('#0c192e'),
        opacity: this.isCombatActive ? 0.45 : isDeployed ? 1.0 : 0.85,
        useInput: !this.isCombatActive,
        ...layerOpt,
      });
      this.squadTray.addChild(card);
      card.setLocalPosition(startX + i * (cardWidth + cardGap), 0, 0);

      // Card Top Trim
      const trim = new Entity('CardTrim');
      trim.addComponent('element', {
        type: 'image',
        anchor: [0.5, 1, 0.5, 1],
        pivot: [0.5, 1],
        width: cardWidth - 4,
        height: 2,
        color: isDeployed ? colorFromHex('#22c55e') : colorFromHex('#38bdf8'),
        ...layerOpt,
      });
      card.addChild(trim);
      trim.setLocalPosition(0, 0, 0);

      const cardTitle = new Entity('CardTitle');
      cardTitle.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 12,
        text: `${def.displayName.slice(0, 6)} [${summon.tier}]`,
        color: isDeployed ? colorFromHex('#fde047') : colorFromHex('#ffffff'),
        autoWidth: false,
        autoHeight: false,
        width: cardWidth,
        height: 24,
        alignment: [0.5, 0.5],
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      card.addChild(cardTitle);
      cardTitle.setLocalPosition(0, 8, 0);

      const statusLabel = isDeployed
        ? placement
          ? `✓ [${placement.cell.x},${placement.cell.z}]`
          : '✓ DEPLOYED'
        : `DRAG / TAP (${pwr})`;

      const cardTag = new Entity('CardTag');
      cardTag.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 10,
        text: statusLabel,
        color: isDeployed ? colorFromHex('#4ade80') : colorFromHex('#94a3b8'),
        autoWidth: false,
        autoHeight: false,
        width: cardWidth,
        height: 20,
        alignment: [0.5, 0.5],
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      card.addChild(cardTag);
      cardTag.setLocalPosition(0, -12, 0);

      // Drag vs Tap interaction handling
      let pointerStartX = 0;
      let pointerStartY = 0;
      let isPointerDown = false;
      let hasStartedDrag = false;

      const onPointerDown = (e: any) => {
        if (this.isCombatActive) return;
        const coords = this.getEventCoordinates(e);
        pointerStartX = coords.x;
        pointerStartY = coords.y;
        isPointerDown = true;
        hasStartedDrag = false;
      };

      const onPointerMove = (e: any) => {
        if (this.isCombatActive || !isPointerDown || hasStartedDrag) return;
        const coords = this.getEventCoordinates(e);
        const dx = coords.x - pointerStartX;
        const dy = coords.y - pointerStartY;
        if (Math.hypot(dx, dy) > 8) {
          hasStartedDrag = true;
          this.onCardDragStart?.(summon, coords.x, coords.y);
        }
      };

      const onPointerUp = (e: any) => {
        if (this.isCombatActive || !isPointerDown) return;
        isPointerDown = false;
        if (!hasStartedDrag) {
          this.onToggleDeploy?.(summon);
        }
      };

      card.element?.on('mousedown', onPointerDown);
      card.element?.on('touchstart', onPointerDown);
      card.element?.on('mousemove', onPointerMove);
      card.element?.on('touchmove', onPointerMove);
      card.element?.on('mouseup', onPointerUp);
      card.element?.on('touchend', onPointerUp);
    }

    // Next Page Button if multiple pages
    if (totalPages > 1) {
      const nextBtn = new Entity('NextPageBtn');
      nextBtn.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: 32,
        height: 56,
        color: this.pageIndex < totalPages - 1 ? colorFromHex('#0f172a') : colorFromHex('#080d1a'),
        opacity: this.pageIndex < totalPages - 1 ? 0.95 : 0.4,
        useInput: this.pageIndex < totalPages - 1,
        ...layerOpt,
      });
      this.squadTray.addChild(nextBtn);
      nextBtn.setLocalPosition(totalW / 2 + 24, 0, 0);

      const nextText = new Entity('NextText');
      nextText.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 16,
        text: '▶',
        color: this.pageIndex < totalPages - 1 ? colorFromHex('#38bdf8') : colorFromHex('#475569'),
        alignment: [0.5, 0.5],
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      nextBtn.addChild(nextText);
      nextText.setLocalPosition(0, 0, 0);

      if (this.pageIndex < totalPages - 1) {
        nextBtn.element?.on('click', () => {
          this.pageIndex++;
          this.renderSquadCards();
        });
      }

      // Page Indicator Tag
      const pageTag = new Entity('PageTag');
      pageTag.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 10,
        text: `PAGE ${this.pageIndex + 1}/${totalPages} (${totalRoster} IN CAMP)`,
        color: colorFromHex('#94a3b8'),
        anchor: [0.5, 1, 0.5, 1],
        pivot: [0.5, 0],
        alignment: [0.5, 0.5],
        ...layerOpt,
      });
      this.squadTray.addChild(pageTag);
      pageTag.setLocalPosition(0, 36, 0);
    }

    // Update Start Button status
    if (this.startBtnText.element) {
      if (this.isCombatActive) {
        this.startBtnText.element.text = 'BATTLE ACTIVE ⚔️';
      } else {
        const deployedCount = this.deployedSummonIds.size;
        this.startBtnText.element.text = deployedCount > 0 ? `START BATTLE ⚔️ (${deployedCount}/6)` : 'SELECT SQUAD (0/6)';
      }
    }
  }

  setLevelInfo(level: number, arc: CampaignArc, isMiniBoss: boolean, isBoss: boolean): void {
    if (this.titleText.element) {
      const bossTag = isBoss ? ' ★ ARC BOSS' : isMiniBoss ? ' • MINI-BOSS' : '';
      this.titleText.element.text = `CAMPAIGN • ARC ${arc.arcNumber}: ${arc.title.toUpperCase()} (LVL ${level})${bossTag}`;
      this.titleText.element.color = colorFromHex(arc.themeColor);
    }
  }

  setSquadInfo(count: number, maxCount: number, powerLevel: number, allianceSummary: string): void {
    if (this.statusText.element) {
      this.statusText.element.text = `SQUAD: ${count}/${maxCount} DEPLOYED  •  ⚡ POWER: ${powerLevel}  •  ${allianceSummary}`;
    }
  }

  showResultModal(isVictory: boolean, level: number, rewardBalls: number): void {
    this.resultModal.enabled = true;
    if (isVictory) {
      if (this.resultTrim.element) this.resultTrim.element.color = colorFromHex('#22c55e');
      if (this.resultTitle.element) {
        this.resultTitle.element.text = `VICTORY! LEVEL ${level} CLEARED`;
        this.resultTitle.element.color = colorFromHex('#22c55e');
      }
      if (this.resultRewardText.element) {
        this.resultRewardText.element.text = `+${rewardBalls} MEDALS EARNED (メダル)`;
        this.resultRewardText.element.color = colorFromHex('#fde047');
      }
      this.nextLevelBtn.enabled = true;
    } else {
      if (this.resultTrim.element) this.resultTrim.element.color = colorFromHex('#ef4444');
      if (this.resultTitle.element) {
        this.resultTitle.element.text = 'DEFEAT! SQUAD WIPED OUT';
        this.resultTitle.element.color = colorFromHex('#ef4444');
      }
      if (this.resultRewardText.element) {
        this.resultRewardText.element.text = 'Merge and level up your Summons to try again!';
        this.resultRewardText.element.color = colorFromHex('#94a3b8');
      }
      this.nextLevelBtn.enabled = false;
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.setCombatActive(false);
    this.resultModal.enabled = false;
    this.root.enabled = true;
    this.audio.playInspectorOpen();
  }

  close(suppressCallback: boolean = false): void {
    if (!this.isOpen && !this.root.enabled) return;
    this.isOpen = false;
    this.setCombatActive(false);
    this.resultModal.enabled = false;
    this.root.enabled = false;
    this.audio.playInspectorClose();
    if (!suppressCallback) {
      this.onClose?.();
    }
  }

  destroy(): void {
    this.root.destroy();
  }
}
