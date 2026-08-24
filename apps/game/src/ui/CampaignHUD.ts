import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { CampaignArc } from '../campaign/CampaignController';
import type { SummonInstance } from '@psyblr/contracts';
import { getSummonDefinition } from '@psyblr/game-content';

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

  // Victory / Defeat Modal
  private resultModal: Entity;
  private resultTitle: Entity;
  private resultRewardText: Entity;
  private nextLevelBtn: Entity;
  private returnCampBtn: Entity;

  public autoCast: boolean = true;
  private currentRoster: readonly SummonInstance[] = [];

  public onStartBattle?: () => void;
  public onNextLevel?: () => void;
  public onClose?: () => void;
  public onToggleAutoCast?: (auto: boolean) => void;

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
    this.root.setLocalPosition(0, 0, 0);
    screenEntity.addChild(this.root);

    // 1. Top Header Bar
    this.topBar = new Entity('CampaignTopBar');
    this.topBar.setLocalPosition(0, -32, 0);
    this.topBar.addComponent('element', {
      type: 'group',
      anchor: [0, 1, 1, 1],
      pivot: [0.5, 1],
      height: 64,
      ...layerOpt,
    });
    this.root.addChild(this.topBar);

    this.titleText = new Entity('CampaignTitle');
    this.titleText.setLocalPosition(32, 0, 0);
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 20,
      text: 'CAMPAIGN • ARC 1: AWAKENING (LEVEL 1)',
      color: new Color(0.2, 0.75, 0.95), // Celestial Cyan
      anchor: [0, 0.5, 0, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.topBar.addChild(this.titleText);

    this.statusText = new Entity('CampaignStatus');
    this.statusText.setLocalPosition(32, -26, 0);
    this.statusText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '6 SQUAD SUMMONS • AUTO-BATTLER RESOLUTION',
      color: new Color(0.7, 0.8, 0.95),
      anchor: [0, 0.5, 0, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.topBar.addChild(this.statusText);

    // [RETURN TO BASE] Button Top-Right (Clickable image target)
    this.closeBtn = new Entity('CampBackButton');
    this.closeBtn.setLocalPosition(-110, 0, 0);
    this.closeBtn.addComponent('element', {
      type: 'image',
      anchor: [1, 0.5, 1, 0.5],
      pivot: [0.5, 0.5],
      width: 180,
      height: 38,
      color: new Color(0.12, 0.18, 0.32),
      useInput: true,
      ...layerOpt,
    });
    this.topBar.addChild(this.closeBtn);

    const closeText = new Entity('CampBackText');
    closeText.setLocalPosition(0, 0, 0);
    closeText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '← RETURN TO BASE',
      color: new Color(0.85, 0.9, 0.98),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.closeBtn.addChild(closeText);

    this.closeBtn.element?.on('click', () => this.close());
    this.closeBtn.element?.on('touchend', () => this.close());

    // 2. Bottom Squad Deployment Bar
    this.squadTray = new Entity('CampaignSquadTray');
    this.squadTray.setLocalPosition(0, 48, 0);
    this.squadTray.addComponent('element', {
      type: 'group',
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0],
      width: 580,
      height: 56,
      ...layerOpt,
    });
    this.root.addChild(this.squadTray);

    // 3. Auto-Cast Toggle (Bottom-Left)
    this.autoCastBtn = new Entity('AutoCastBtn');
    this.autoCastBtn.setLocalPosition(48, 48, 0);
    this.autoCastBtn.addComponent('element', {
      type: 'image',
      anchor: [0, 0, 0, 0],
      pivot: [0, 0],
      width: 160,
      height: 48,
      color: new Color(0.08, 0.45, 0.65),
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.autoCastBtn);

    this.autoCastText = new Entity('AutoCastText');
    this.autoCastText.setLocalPosition(0, 0, 0);
    this.autoCastText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: 'AUTO-CAST: [ON]',
      color: new Color(1, 1, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.autoCastBtn.addChild(this.autoCastText);

    this.autoCastBtn.element?.on('click', () => {
      this.autoCast = !this.autoCast;
      if (this.autoCastText.element) {
        this.autoCastText.element.text = `AUTO-CAST: [${this.autoCast ? 'ON' : 'OFF'}]`;
      }
      this.onToggleAutoCast?.(this.autoCast);
    });

    // 4. [START BATTLE] Button (Bottom-Right)
    this.startBtn = new Entity('StartCampBattleBtn');
    this.startBtn.setLocalPosition(-48, 48, 0);
    this.startBtn.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0],
      pivot: [1, 0],
      width: 220,
      height: 48,
      color: new Color(0.02, 0.52, 0.8),
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.startBtn);

    const btnText = new Entity('StartCampBtnText');
    btnText.setLocalPosition(0, 0, 0);
    btnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'START BATTLE ⚔️',
      color: new Color(1, 1, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.startBtn.addChild(btnText);

    this.startBtn.element?.on('click', () => this.onStartBattle?.());
    this.startBtn.element?.on('touchend', () => this.onStartBattle?.());

    // 5. Victory / Defeat Modal (Centered)
    this.resultModal = new Entity('CampaignResultModal');
    this.resultModal.setLocalPosition(0, 0, 0);
    this.resultModal.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 520,
      height: 320,
      color: new Color(0.04, 0.08, 0.18),
      opacity: 0.98,
      useInput: true,
      ...layerOpt,
    });
    this.resultModal.enabled = false;
    this.root.addChild(this.resultModal);

    this.resultTitle = new Entity('ResultTitle');
    this.resultTitle.setLocalPosition(0, 95, 0);
    this.resultTitle.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 22,
      text: 'VICTORY!',
      color: new Color(0.2, 0.9, 0.5),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.resultModal.addChild(this.resultTitle);

    this.resultRewardText = new Entity('ResultReward');
    this.resultRewardText.setLocalPosition(0, 40, 0);
    this.resultRewardText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: '+2 PLINKO BALLS EARNED',
      color: new Color(0.96, 0.75, 0.1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.resultModal.addChild(this.resultRewardText);

    this.nextLevelBtn = new Entity('NextLevelBtn');
    this.nextLevelBtn.setLocalPosition(0, -25, 0);
    this.nextLevelBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 260,
      height: 44,
      color: new Color(0.02, 0.52, 0.8),
      useInput: true,
      ...layerOpt,
    });
    this.resultModal.addChild(this.nextLevelBtn);

    const nextText = new Entity('NextBtnText');
    nextText.setLocalPosition(0, 0, 0);
    nextText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'NEXT LEVEL →',
      color: new Color(1, 1, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.nextLevelBtn.addChild(nextText);

    this.nextLevelBtn.element?.on('click', () => {
      this.resultModal.enabled = false;
      this.onNextLevel?.();
    });

    this.returnCampBtn = new Entity('ReturnCampBtn');
    this.returnCampBtn.setLocalPosition(0, -85, 0);
    this.returnCampBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 260,
      height: 38,
      color: new Color(0.12, 0.18, 0.28),
      useInput: true,
      ...layerOpt,
    });
    this.resultModal.addChild(this.returnCampBtn);

    const retModalText = new Entity('ReturnModalText');
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

  setRoster(roster: readonly SummonInstance[]): void {
    this.currentRoster = roster;
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    // Clear previous
    const children = [...this.squadTray.children];
    for (const child of children) {
      child.destroy();
    }

    const cardWidth = 86;
    const cardGap = 8;
    const count = Math.min(6, this.currentRoster.length);
    const totalW = count * cardWidth + (count - 1) * cardGap;
    const startX = -totalW / 2 + cardWidth / 2;

    for (let i = 0; i < count; i++) {
      const summon = this.currentRoster[i]!;
      const def = getSummonDefinition(summon.definitionId);
      const card = new Entity(`SquadCard_${summon.id}`);
      card.setLocalPosition(startX + i * (cardWidth + cardGap), 0, 0);
      card.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: cardWidth,
        height: 48,
        color: new Color(0.08, 0.16, 0.28),
        useInput: true,
        ...layerOpt,
      });
      this.squadTray.addChild(card);

      const cardText = new Entity('SquadCardText');
      cardText.setLocalPosition(0, 0, 0);
      cardText.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 10,
        text: `${def.displayName.slice(0, 5)}\n[${summon.tier}]`,
        color: new Color(0.96, 0.62, 0.04), // Gold
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      card.addChild(cardText);
    }
  }

  setStatus(text: string, colorHex: string = '#f1f5f9'): void {
    if (this.statusText.element) {
      this.statusText.element.text = text;
      this.statusText.element.color = new Color().fromString(colorHex);
    }
  }

  setLevelInfo(level: number, arc: CampaignArc, isMiniBoss: boolean, isBoss: boolean): void {
    if (this.titleText.element) {
      this.titleText.element.text = `CAMPAIGN • ARC ${arc.arcNumber}: ${arc.title.toUpperCase()} (LEVEL ${level})`;
    }
    if (this.statusText.element) {
      if (isBoss) {
        this.statusText.element.text = `⚠️ MAIN BOSS ENCOUNTER (LEVEL ${level}) • COLOSSAL STORY TITAN`;
        this.statusText.element.color = new Color(0.9, 0.2, 0.9);
      } else if (isMiniBoss) {
        this.statusText.element.text = `⚠️ MINI-BOSS ENCOUNTER (LEVEL ${level}) • EMPOWERED COMMANDER`;
        this.statusText.element.color = new Color(0.95, 0.5, 0.1);
      } else {
        this.statusText.element.text = `LEVEL ${level} • 6 SQUAD SUMMONS • AUTO-BATTLER RESOLUTION`;
        this.statusText.element.color = new Color(0.7, 0.8, 0.95);
      }
    }
  }

  showResultModal(isVictory: boolean, level: number, rewardBalls: number): void {
    this.resultModal.enabled = true;
    if (isVictory) {
      if (this.resultTitle.element) {
        this.resultTitle.element.text = `VICTORY! LEVEL ${level} CLEARED`;
        this.resultTitle.element.color = new Color(0.2, 0.9, 0.5);
      }
      if (this.resultRewardText.element) {
        this.resultRewardText.element.text = `+${rewardBalls} PLINKO BALLS EARNED`;
      }
      this.nextLevelBtn.enabled = true;
    } else {
      if (this.resultTitle.element) {
        this.resultTitle.element.text = 'DEFEAT! SQUAD WIPED OUT';
        this.resultTitle.element.color = new Color(0.9, 0.2, 0.2);
      }
      if (this.resultRewardText.element) {
        this.resultRewardText.element.text = 'Merge and level up your Summons to try again!';
      }
      this.nextLevelBtn.enabled = false;
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.resultModal.enabled = false;
    this.root.enabled = true;
    this.audio.playInspectorOpen();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.resultModal.enabled = false;
    this.root.enabled = false;
    this.audio.playInspectorClose();
    this.onClose?.();
  }

  destroy(): void {
    this.root.destroy();
  }
}
