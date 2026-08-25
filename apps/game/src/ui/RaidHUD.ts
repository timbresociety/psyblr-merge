import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { SummonInstance } from '@psyblr/contracts';
import { getSummonDefinition } from '@psyblr/game-content';
import { resolveSummonPowerLevel, TIERS } from '@psyblr/game-rules';

export type StartCombatCallback = () => void;
export type RaidCloseCallback = () => void;
export type StealProceedCallback = () => void;

export class RaidHUD {
  public root: Entity;
  public isOpen: boolean = false;

  private topBar: Entity;
  private startButton: Entity;
  private startBtnText: Entity;
  private closeButton: Entity;
  private titleText: Entity;
  private statusText: Entity;
  private roundScoreText: Entity;
  private squadTray: Entity;
  private withdrawBtn!: Entity;
  private autoDeployBtn!: Entity;

  // Match Summary Modal
  private matchModal: Entity;
  private matchTrim: Entity;
  private matchTitle: Entity;
  private matchSubtitle: Entity;
  private proceedStealBtn: Entity;
  private returnCampBtn: Entity;

  public isCombatActive: boolean = false;
  private currentRoster: readonly SummonInstance[] = [];
  private deployedSummonIds: Set<string> = new Set();
  private requiredSlotCount: number = 2;
  private countdownTimer: number = 10;
  private timerInterval: any = null;
  public pageIndex: number = 0;
  private readonly CARDS_PER_PAGE: number = 6;
  private lastPlacements?: readonly { summonId: string; cell: { x: number; z: number } }[] | undefined;

  public onStartCombat?: StartCombatCallback;
  public onProceedToSteal?: StealProceedCallback;
  public onClose?: RaidCloseCallback;
  public onToggleDeploy?: (summon: SummonInstance) => void;
  public onTimerExpired?: () => void;
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

    this.root = new Entity('RaidHUD_Root');
    this.root.enabled = false;
    screenEntity.addChild(this.root);
    this.root.setLocalPosition(0, 0, 0);

    // 1. Top Header Bar
    this.topBar = new Entity('RaidTopBar');
    this.topBar.addComponent('element', {
      type: 'group',
      anchor: [0, 1, 1, 1],
      pivot: [0, 1],
      height: 80,
      ...layerOpt,
    });
    this.root.addChild(this.topBar);
    this.topBar.setLocalPosition(0, 0, 0);

    this.titleText = new Entity('RaidTitle');
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 20,
      text: 'RAID ARENA • 3-ROUND MATCH (ROUND 1: 2v2)',
      color: colorFromHex('#f87171'), // Crimson Red
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.topBar.addChild(this.titleText);
    this.titleText.setLocalPosition(32, -24, 0);

    this.statusText = new Entity('RaidStatus');
    this.statusText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'ROUND 1: DEPLOY 2 ATTACKERS (Z >= 4)  •  TIMER: 10s',
      color: colorFromHex('#f8fafc'),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.topBar.addChild(this.statusText);
    this.statusText.setLocalPosition(32, -54, 0);

    // Round Score Tracker on Center-Top
    this.roundScoreText = new Entity('RaidRoundScore');
    this.roundScoreText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'SERIES: R1 [PENDING] • R2 [PENDING] • R3 [PENDING]',
      color: colorFromHex('#fde047'), // Gold
      anchor: [0.5, 1, 0.5, 1],
      pivot: [0.5, 1],
      ...layerOpt,
    });
    this.topBar.addChild(this.roundScoreText);
    this.roundScoreText.setLocalPosition(0, -24, 0);

    // [RETURN TO BASE] Button Top-Right
    this.closeButton = new Entity('RaidBackButton');
    this.closeButton.addComponent('element', {
      type: 'image',
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      width: 180,
      height: 38,
      color: colorFromHex('#1e1215'),
      useInput: true,
      ...layerOpt,
    });
    this.topBar.addChild(this.closeButton);
    this.closeButton.setLocalPosition(-32, -24, 0);

    const closeTrim = new Entity('RaidBackTrim');
    closeTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 176,
      height: 2,
      color: colorFromHex('#f87171'),
      ...layerOpt,
    });
    this.closeButton.addChild(closeTrim);
    closeTrim.setLocalPosition(0, 18, 0);

    const retText = new Entity('RaidRetText');
    retText.addComponent('element', {
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
    this.closeButton.addChild(retText);
    retText.setLocalPosition(0, 0, 0);

    this.closeButton.element?.on('click', () => this.close());
    this.closeButton.element?.on('touchend', () => this.close());

    // 2. Bottom Squad Tray
    this.squadTray = new Entity('RaidSquadTray');
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

    // 3. [START ROUND COMBAT] Action Button Bottom-Right
    this.startButton = new Entity('StartCombatButton');
    this.startButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0],
      pivot: [1, 0],
      width: 250,
      height: 50,
      color: colorFromHex('#b91c1c'), // Crimson
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.startButton);
    this.startButton.setLocalPosition(-48, 50, 0);

    const startTrim = new Entity('StartCombatTrim');
    startTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 246,
      height: 2,
      color: colorFromHex('#f87171'),
      ...layerOpt,
    });
    this.startButton.addChild(startTrim);
    startTrim.setLocalPosition(0, 24, 0);

    this.startBtnText = new Entity('StartBtnText');
    this.startBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'START COMBAT ⚔️',
      color: new Color(1, 1, 1),
      autoWidth: false,
      autoHeight: false,
      width: 250,
      height: 50,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.startButton.addChild(this.startBtnText);
    this.startBtnText.setLocalPosition(0, 0, 0);

    this.startButton.element?.on('click', () => {
      if (this.isCombatActive) return;
      this.stopTimer();
      this.onStartCombat?.();
    });
    this.startButton.element?.on('touchend', () => {
      if (this.isCombatActive) return;
      this.stopTimer();
      this.onStartCombat?.();
    });

    // 4. Squad Quick Management Action Buttons (Above Squad Tray)
    // [ ↺ WITHDRAW ALL ]
    this.withdrawBtn = new Entity('RaidWithdrawBtn');
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
    this.autoDeployBtn = new Entity('RaidAutoDeployBtn');
    this.autoDeployBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0],
      width: 150,
      height: 32,
      color: colorFromHex('#2a121d'),
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

    // 5. Match Summary Modal (Centered)
    this.matchModal = new Entity('RaidMatchModal');
    this.matchModal.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 560,
      height: 340,
      color: colorFromHex('#080d1a'),
      opacity: 0.98,
      useInput: true,
      ...layerOpt,
    });
    this.matchModal.enabled = false;
    this.root.addChild(this.matchModal);
    this.matchModal.setLocalPosition(0, 0, 0);

    this.matchTrim = new Entity('MatchTrim');
    this.matchTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 1, 0.5, 1],
      pivot: [0.5, 1],
      width: 560,
      height: 4,
      color: colorFromHex('#22c55e'),
      ...layerOpt,
    });
    this.matchModal.addChild(this.matchTrim);
    this.matchTrim.setLocalPosition(0, 0, 1);

    this.matchTitle = new Entity('MatchModalTitle');
    this.matchTitle.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 24,
      text: 'MATCH VICTORY!',
      color: colorFromHex('#22c55e'),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.matchModal.addChild(this.matchTitle);
    this.matchTitle.setLocalPosition(0, 100, 1);

    this.matchSubtitle = new Entity('MatchModalSubtitle');
    this.matchSubtitle.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      lineHeight: 20,
      wrapLines: true,
      width: 480,
      text: 'You shattered the opponent defense! Infiltrate their camp and claim 1 exposed Summon.',
      color: colorFromHex('#f8fafc'),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.matchModal.addChild(this.matchSubtitle);
    this.matchSubtitle.setLocalPosition(0, 40, 1);

    this.proceedStealBtn = new Entity('ProceedStealBtn');
    this.proceedStealBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 320,
      height: 46,
      color: colorFromHex('#0284c7'), // Cyan Blue
      useInput: true,
      ...layerOpt,
    });
    this.matchModal.addChild(this.proceedStealBtn);
    this.proceedStealBtn.setLocalPosition(0, -25, 1);

    const stealTrim = new Entity('StealTrim');
    stealTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 1, 0.5, 1],
      pivot: [0.5, 1],
      width: 316,
      height: 2,
      color: colorFromHex('#38bdf8'),
      ...layerOpt,
    });
    this.proceedStealBtn.addChild(stealTrim);
    stealTrim.setLocalPosition(0, 0, 1);

    const stealBtnText = new Entity('StealBtnText');
    stealBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'INFILTRATE CAMP & CLAIM PRIZE →',
      color: new Color(1, 1, 1),
      autoWidth: false,
      autoHeight: false,
      width: 320,
      height: 46,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.proceedStealBtn.addChild(stealBtnText);
    stealBtnText.setLocalPosition(0, 0, 1);

    this.proceedStealBtn.element?.on('click', () => {
      this.matchModal.enabled = false;
      this.onProceedToSteal?.();
    });

    this.returnCampBtn = new Entity('ReturnCampFromRaidBtn');
    this.returnCampBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 320,
      height: 40,
      color: colorFromHex('#1e293b'),
      useInput: true,
      ...layerOpt,
    });
    this.matchModal.addChild(this.returnCampBtn);
    this.returnCampBtn.setLocalPosition(0, -85, 1);

    const retModalText = new Entity('RetModalText');
    retModalText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '← RETURN TO BASE CAMP',
      color: colorFromHex('#f8fafc'),
      autoWidth: false,
      autoHeight: false,
      width: 320,
      height: 40,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.returnCampBtn.addChild(retModalText);
    retModalText.setLocalPosition(0, 0, 1);

    this.returnCampBtn.element?.on('click', () => {
      this.matchModal.enabled = false;
      this.close();
    });

    // ESC key listener
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
    if (active) {
      this.stopTimer();
    }
    if (this.withdrawBtn.element) {
      this.withdrawBtn.element.useInput = !active;
      this.withdrawBtn.element.opacity = active ? 0.4 : 0.95;
    }
    if (this.autoDeployBtn.element) {
      this.autoDeployBtn.element.useInput = !active;
      this.autoDeployBtn.element.opacity = active ? 0.4 : 0.95;
    }
    if (this.startButton.element) {
      this.startButton.element.useInput = !active;
      this.startButton.element.opacity = active ? 0.5 : 1.0;
    }
    if (this.startBtnText.element) {
      if (active) {
        this.startBtnText.element.text = 'ROUND COMBAT ACTIVE ⚔️';
      } else {
        const deployedCount = this.deployedSummonIds.size;
        this.startBtnText.element.text = `START ROUND (${deployedCount}/${this.requiredSlotCount}) ⚔️`;
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

    // Clear previous cards & controls
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
      const prevBtn = new Entity('RaidPrevPageBtn');
      prevBtn.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: 32,
        height: 56,
        color: this.pageIndex > 0 ? colorFromHex('#18101a') : colorFromHex('#0d080e'),
        opacity: this.pageIndex > 0 ? 0.95 : 0.4,
        useInput: this.pageIndex > 0,
        ...layerOpt,
      });
      this.squadTray.addChild(prevBtn);
      prevBtn.setLocalPosition(startX - cardWidth / 2 - 24, 0, 0);

      const prevText = new Entity('RaidPrevText');
      prevText.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 16,
        text: '◀',
        color: this.pageIndex > 0 ? colorFromHex('#f87171') : colorFromHex('#475569'),
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

      const card = new Entity(`RaidSquadCard_${summon.id}`);
      card.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: cardWidth,
        height: 56,
        color: isDeployed ? colorFromHex('#7f1d1d') : colorFromHex('#18101a'),
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
        color: isDeployed ? colorFromHex('#f87171') : colorFromHex('#fb7185'),
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
        color: isDeployed ? colorFromHex('#fca5a5') : colorFromHex('#94a3b8'),
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
      const nextBtn = new Entity('RaidNextPageBtn');
      nextBtn.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: 32,
        height: 56,
        color: this.pageIndex < totalPages - 1 ? colorFromHex('#18101a') : colorFromHex('#0d080e'),
        opacity: this.pageIndex < totalPages - 1 ? 0.95 : 0.4,
        useInput: this.pageIndex < totalPages - 1,
        ...layerOpt,
      });
      this.squadTray.addChild(nextBtn);
      nextBtn.setLocalPosition(totalW / 2 + 24, 0, 0);

      const nextText = new Entity('RaidNextText');
      nextText.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 16,
        text: '▶',
        color: this.pageIndex < totalPages - 1 ? colorFromHex('#f87171') : colorFromHex('#475569'),
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
      const pageTag = new Entity('RaidPageTag');
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
        this.startBtnText.element.text = 'ROUND COMBAT ACTIVE ⚔️';
      } else {
        const deployedCount = this.deployedSummonIds.size;
        this.startBtnText.element.text = `START ROUND (${deployedCount}/${this.requiredSlotCount}) ⚔️`;
      }
    }
  }

  setRound(
    roundNumber: 1 | 2 | 3,
    slotCount: 2 | 4 | 6,
    roundResults: ('win' | 'loss' | 'pending')[]
  ): void {
    this.setCombatActive(false);
    this.requiredSlotCount = slotCount;
    this.countdownTimer = roundNumber === 1 ? 10 : roundNumber === 2 ? 20 : 30;

    if (this.titleText.element) {
      this.titleText.element.text = `RAID ARENA • 3-ROUND MATCH (ROUND ${roundNumber}: ${slotCount}v${slotCount})`;
    }
    this.updateStatusDisplay();

    if (this.roundScoreText.element) {
      const formatted = roundResults.map((r, i) => `R${i + 1} [${r.toUpperCase()}]`).join(' • ');
      this.roundScoreText.element.text = `SERIES: ${formatted}`;
    }

    this.startTimer();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.countdownTimer--;
      this.updateStatusDisplay();
      if (this.countdownTimer <= 0) {
        this.stopTimer();
        this.onTimerExpired?.();
      }
    }, 1000);
  }

  public stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateStatusDisplay(): void {
    if (this.statusText.element) {
      const deployed = this.deployedSummonIds.size;
      this.statusText.element.text = `DEPLOY ${this.requiredSlotCount} ATTACKERS (${deployed}/${this.requiredSlotCount})  •  AUTO-DEPLOYS IN: ${this.countdownTimer}s`;
      this.statusText.element.color = this.countdownTimer <= 3 ? colorFromHex('#f87171') : colorFromHex('#f8fafc');
    }
  }

  setStatus(text: string, colorHex: string = '#f1f5f9'): void {
    if (this.statusText.element) {
      this.statusText.element.text = text;
      this.statusText.element.color = colorFromHex(colorHex);
    }
  }

  showMatchResult(isVictory: boolean, wins: number, losses: number): void {
    this.stopTimer();
    this.matchModal.enabled = true;
    if (isVictory) {
      if (this.matchTrim.element) this.matchTrim.element.color = colorFromHex('#22c55e');
      if (this.matchTitle.element) {
        this.matchTitle.element.text = `MATCH VICTORY! (${wins} - ${losses})`;
        this.matchTitle.element.color = colorFromHex('#22c55e');
      }
      if (this.matchSubtitle.element) {
        this.matchSubtitle.element.text = 'You shattered the opponent defense! Infiltrate their camp and claim 1 exposed Summon.';
      }
      this.proceedStealBtn.enabled = true;
    } else {
      if (this.matchTrim.element) this.matchTrim.element.color = colorFromHex('#ef4444');
      if (this.matchTitle.element) {
        this.matchTitle.element.text = `MATCH DEFEAT (${wins} - ${losses})`;
        this.matchTitle.element.color = colorFromHex('#ef4444');
      }
      if (this.matchSubtitle.element) {
        this.matchSubtitle.element.text = 'Your raid squad was defeated. Level up and merge your Summons to try again!';
      }
      this.proceedStealBtn.enabled = false;
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.setCombatActive(false);
    this.matchModal.enabled = false;
    this.root.enabled = true;
    this.audio.playInspectorOpen();
  }

  close(suppressCallback: boolean = false): void {
    if (!this.isOpen && !this.root.enabled) return;
    this.isOpen = false;
    this.setCombatActive(false);
    this.stopTimer();
    this.matchModal.enabled = false;
    this.root.enabled = false;
    this.audio.playInspectorClose();
    if (!suppressCallback) {
      this.onClose?.();
    }
  }

  destroy(): void {
    this.stopTimer();
    this.root.destroy();
  }
}
