import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import type { AudioDirector } from '../presentation/AudioDirector';

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

  // Match Summary Modal
  private matchModal: Entity;
  private matchTitle: Entity;
  private matchSubtitle: Entity;
  private proceedStealBtn: Entity;
  private returnCampBtn: Entity;

  public onStartCombat?: StartCombatCallback;
  public onProceedToSteal?: StealProceedCallback;
  public onClose?: RaidCloseCallback;

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
    this.root.setLocalPosition(0, 0, 0);
    screenEntity.addChild(this.root);

    // 1. Top Header Bar
    this.topBar = new Entity('RaidTopBar');
    this.topBar.setLocalPosition(0, -32, 0);
    this.topBar.addComponent('element', {
      type: 'group',
      anchor: [0, 1, 1, 1],
      pivot: [0.5, 1],
      height: 72,
      ...layerOpt,
    });
    this.root.addChild(this.topBar);

    this.titleText = new Entity('RaidTitle');
    this.titleText.setLocalPosition(32, 8, 0);
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 20,
      text: 'RAID ARENA • 3-ROUND MATCH (ROUND 1: 2v2)',
      color: new Color(0.94, 0.27, 0.27), // Crimson
      anchor: [0, 0.5, 0, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.topBar.addChild(this.titleText);

    this.statusText = new Entity('RaidStatus');
    this.statusText.setLocalPosition(32, -18, 0);
    this.statusText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: 'ROUND 1: 2 ATTACKERS (Z >= 4) VS 2 DEFENDERS (Z < 4)',
      color: new Color(0.85, 0.75, 0.75),
      anchor: [0, 0.5, 0, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.topBar.addChild(this.statusText);

    // Round Score Tracker on Center-Top
    this.roundScoreText = new Entity('RaidRoundScore');
    this.roundScoreText.setLocalPosition(0, -18, 0);
    this.roundScoreText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'SERIES: R1 [PENDING] • R2 [PENDING] • R3 [PENDING]',
      color: new Color(0.96, 0.62, 0.04), // Gold
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.topBar.addChild(this.roundScoreText);

    // [RETURN TO BASE] Button Top-Right
    this.closeButton = new Entity('RaidBackButton');
    this.closeButton.setLocalPosition(-110, 0, 0);
    this.closeButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0.5, 1, 0.5],
      pivot: [0.5, 0.5],
      width: 180,
      height: 38,
      color: new Color(0.2, 0.12, 0.15),
      useInput: true,
      ...layerOpt,
    });
    this.topBar.addChild(this.closeButton);

    const retText = new Entity('RaidRetText');
    retText.setLocalPosition(0, 0, 0);
    retText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '← RETURN TO BASE',
      color: new Color(0.85, 0.9, 0.98),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.closeButton.addChild(retText);

    this.closeButton.element?.on('click', () => this.close());
    this.closeButton.element?.on('touchend', () => this.close());

    // 2. [START ROUND COMBAT] Action Button Bottom-Right
    this.startButton = new Entity('StartCombatButton');
    this.startButton.setLocalPosition(-48, 48, 0);
    this.startButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0],
      pivot: [1, 0],
      width: 250,
      height: 52,
      color: new Color(0.88, 0.22, 0.22),
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.startButton);

    this.startBtnText = new Entity('StartBtnText');
    this.startBtnText.setLocalPosition(0, 0, 0);
    this.startBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'START ROUND COMBAT ⚔️',
      color: new Color(1, 1, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.startButton.addChild(this.startBtnText);

    this.startButton.element?.on('click', () => this.onStartCombat?.());
    this.startButton.element?.on('touchend', () => this.onStartCombat?.());

    // 3. Match Summary Modal (Centered)
    this.matchModal = new Entity('RaidMatchModal');
    this.matchModal.setLocalPosition(0, 0, 0);
    this.matchModal.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 560,
      height: 340,
      color: new Color(0.06, 0.08, 0.16),
      opacity: 0.98,
      useInput: true,
      ...layerOpt,
    });
    this.matchModal.enabled = false;
    this.root.addChild(this.matchModal);

    this.matchTitle = new Entity('MatchModalTitle');
    this.matchTitle.setLocalPosition(0, 100, 0);
    this.matchTitle.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 22,
      text: 'MATCH VICTORY!',
      color: new Color(0.2, 0.9, 0.5),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.matchModal.addChild(this.matchTitle);

    this.matchSubtitle = new Entity('MatchModalSubtitle');
    this.matchSubtitle.setLocalPosition(0, 40, 0);
    this.matchSubtitle.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      lineHeight: 20,
      wrapLines: true,
      width: 480,
      text: 'You shattered the opponent defense! Infiltrate their camp and claim 1 exposed Summon.',
      color: new Color(0.85, 0.9, 0.98),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.matchModal.addChild(this.matchSubtitle);

    this.proceedStealBtn = new Entity('ProceedStealBtn');
    this.proceedStealBtn.setLocalPosition(0, -35, 0);
    this.proceedStealBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 320,
      height: 46,
      color: new Color(0.96, 0.62, 0.04), // Gold
      useInput: true,
      ...layerOpt,
    });
    this.matchModal.addChild(this.proceedStealBtn);

    const stealBtnText = new Entity('StealBtnText');
    stealBtnText.setLocalPosition(0, 0, 0);
    stealBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'INFILTRATE CAMP & CLAIM PRIZE →',
      color: new Color(0.05, 0.08, 0.16),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.proceedStealBtn.addChild(stealBtnText);

    this.proceedStealBtn.element?.on('click', () => {
      this.matchModal.enabled = false;
      this.onProceedToSteal?.();
    });

    this.returnCampBtn = new Entity('ReturnCampFromRaidBtn');
    this.returnCampBtn.setLocalPosition(0, -95, 0);
    this.returnCampBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 240,
      height: 38,
      color: new Color(0.12, 0.18, 0.28),
      useInput: true,
      ...layerOpt,
    });
    this.matchModal.addChild(this.returnCampBtn);

    const retModalText = new Entity('RetModalText');
    retModalText.setLocalPosition(0, 0, 0);
    retModalText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '← RETURN TO BASE CAMP',
      color: new Color(0.85, 0.9, 0.98),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.returnCampBtn.addChild(retModalText);

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

  setRound(roundNumber: 1 | 2 | 3, slotCount: 2 | 4 | 6, roundResults: ('win' | 'loss' | 'pending')[]): void {
    if (this.titleText.element) {
      this.titleText.element.text = `RAID ARENA • 3-ROUND MATCH (ROUND ${roundNumber}: ${slotCount}v${slotCount})`;
    }
    if (this.statusText.element) {
      this.statusText.element.text = `ROUND ${roundNumber}: ${slotCount} ATTACKERS (Z >= 4) VS ${slotCount} DEFENDERS (Z < 4)`;
    }
    if (this.startBtnText.element) {
      this.startBtnText.element.text = `START ROUND ${roundNumber} (${slotCount}v${slotCount}) ⚔️`;
    }
    if (this.roundScoreText.element) {
      const formatted = roundResults.map((r, i) => `R${i + 1} [${r.toUpperCase()}]`).join(' • ');
      this.roundScoreText.element.text = `SERIES: ${formatted}`;
    }
  }

  setStatus(text: string, colorHex: string = '#f1f5f9'): void {
    if (this.statusText.element) {
      this.statusText.element.text = text;
      this.statusText.element.color = new Color().fromString(colorHex);
    }
  }

  showMatchResult(isVictory: boolean, wins: number, losses: number): void {
    this.matchModal.enabled = true;
    if (isVictory) {
      if (this.matchTitle.element) {
        this.matchTitle.element.text = `MATCH VICTORY! (${wins} - ${losses})`;
        this.matchTitle.element.color = new Color(0.2, 0.9, 0.5);
      }
      if (this.matchSubtitle.element) {
        this.matchSubtitle.element.text = 'You shattered the opponent defense! Infiltrate their camp and claim 1 exposed Summon.';
      }
      this.proceedStealBtn.enabled = true;
    } else {
      if (this.matchTitle.element) {
        this.matchTitle.element.text = `MATCH DEFEAT (${wins} - ${losses})`;
        this.matchTitle.element.color = new Color(0.9, 0.2, 0.2);
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
    this.matchModal.enabled = false;
    this.root.enabled = true;
    this.audio.playInspectorOpen();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.matchModal.enabled = false;
    this.root.enabled = false;
    this.audio.playInspectorClose();
    this.onClose?.();
  }

  destroy(): void {
    this.root.destroy();
  }
}
