import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';

export type DropBallCallback = () => boolean | Promise<boolean>;
export type PachinkoCloseCallback = () => void;

export class PachinkoHUD {
  public root: Entity;
  public isOpen: boolean = false;

  private dropButton: Entity;
  private dropBtnText: Entity;
  private closeButton: Entity;
  private titleText: Entity;
  private shieldMeterText: Entity;
  private statsBarText: Entity;

  // Notification Banner
  private bannerEntity: Entity;
  private bannerText: Entity;
  private bannerTimer?: any;

  // Hold-to-drop tracking
  private isHoldingDrop: boolean = false;
  private holdDropInterval?: any;

  public onDropBall?: DropBallCallback;
  public onClose?: PachinkoCloseCallback;

  private currentMedals: number = 100;
  private currentCampCount: number = 6;
  private maxCampCapacity: number = 36;

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private audio: AudioDirector,
    private fontAsset: Asset,
    screenEntity: Entity,
    private hudLayer?: Layer
  ) {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    this.root = new Entity('PachinkoHUD_Root');
    this.root.enabled = false;
    this.root.setLocalPosition(0, 0, 0);
    screenEntity.addChild(this.root);

    // 1. Sleek Floating Top-Left Title & Bumper Meter (No bulky full-width header bar)
    this.titleText = new Entity('PachinkoTitle');
    this.titleText.setLocalPosition(28, -24, 0);
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 18,
      text: 'SPAWN MACHINE • PACHINKO',
      color: colorFromHex('#fbbf24'), // Amber Gold
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.titleText);

    this.shieldMeterText = new Entity('PachinkoShieldMeter');
    this.shieldMeterText.setLocalPosition(28, -50, 0);
    this.shieldMeterText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'BLOB BUMPERS: [□□□□□] 0/5 (Hit bouncers to charge Time Shield)',
      color: colorFromHex('#38bdf8'), // Vibrant Cyan
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.shieldMeterText);

    // 2. Floating Top-Right Stats & Return Button
    this.statsBarText = new Entity('PachinkoStatsText');
    this.statsBarText.setLocalPosition(-210, -28, 0);
    this.statsBarText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 15,
      text: 'メダル: 100 • CAMP: 6/36',
      color: colorFromHex('#fbbf24'),
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      alignment: [1, 1],
      ...layerOpt,
    });
    this.root.addChild(this.statsBarText);

    // [← RETURN TO BASE] Pill Button Top-Right
    this.closeButton = new Entity('PachinkoBackButton');
    this.closeButton.setLocalPosition(-28, -20, 0);
    this.closeButton.addComponent('element', {
      type: 'image',
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      width: 165,
      height: 34,
      color: colorFromHex('#0f172a'),
      opacity: 0.95,
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.closeButton);

    const closeTrim = new Entity('PachinkoCloseTrim');
    closeTrim.setLocalPosition(0, 16, 0);
    closeTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 161,
      height: 2,
      color: colorFromHex('#38bdf8'),
      ...layerOpt,
    });
    this.closeButton.addChild(closeTrim);

    const closeText = new Entity('PachinkoCloseText');
    closeText.setLocalPosition(0, 0, 0);
    closeText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: '← RETURN TO BASE',
      color: colorFromHex('#ffffff'),
      autoWidth: false,
      autoHeight: false,
      width: 165,
      height: 34,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.closeButton.addChild(closeText);

    this.closeButton.element?.on('click', () => this.close());
    this.closeButton.element?.on('touchend', () => this.close());

    // 3. Bottom Reward Pocket Indicators (6 distinct daily pool slots)
    this.buildRewardPocketIndicators(layerOpt);

    // 4. Center Notification Toast Banner (Appears for errors & rewards)
    this.bannerEntity = new Entity('PachinkoNotificationBanner');
    this.bannerEntity.setLocalPosition(0, 170, 0);
    this.bannerEntity.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0.5],
      width: 640,
      height: 48,
      color: colorFromHex('#0f172a'),
      opacity: 0.96,
      ...layerOpt,
    });
    this.bannerEntity.enabled = false;
    this.root.addChild(this.bannerEntity);

    const bannerTrim = new Entity('BannerTrim');
    bannerTrim.setLocalPosition(0, 23, 0);
    bannerTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 636,
      height: 2,
      color: colorFromHex('#f59e0b'),
      ...layerOpt,
    });
    this.bannerEntity.addChild(bannerTrim);

    this.bannerText = new Entity('BannerText');
    this.bannerText.setLocalPosition(0, 0, 0);
    this.bannerText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: '',
      color: colorFromHex('#ffffff'),
      autoWidth: false,
      autoHeight: false,
      width: 620,
      height: 48,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.bannerEntity.addChild(this.bannerText);

    // 5. Big Arcade [PUSH (1 MEDAL)] Action Button (Clash of Critters Style with Hold-to-Drop)
    this.dropButton = new Entity('DropBallButton');
    this.dropButton.setLocalPosition(0, 22, 0);
    this.dropButton.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0],
      width: 340,
      height: 48,
      color: colorFromHex('#d97706'), // Warm Amber Gold
      opacity: 0.98,
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.dropButton);

    const dropTrim = new Entity('DropBtnTrim');
    dropTrim.setLocalPosition(0, 23, 0);
    dropTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 334,
      height: 2,
      color: colorFromHex('#fef08a'),
      ...layerOpt,
    });
    this.dropButton.addChild(dropTrim);

    this.dropBtnText = new Entity('DropBtnText');
    this.dropBtnText.setLocalPosition(0, 0, 0);
    this.dropBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'PUSH (1 MEDAL) 🎰 • HOLD TO DROP',
      color: colorFromHex('#050810'), // Deep contrast text on gold
      autoWidth: false,
      autoHeight: false,
      width: 340,
      height: 48,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.dropButton.addChild(this.dropBtnText);

    // Wire single click and long-press / hold drop listeners
    this.setupHoldToDropListeners();

    // ESC key listener to dismiss
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  private buildRewardPocketIndicators(layerOpt: any): void {
    const pocketContainer = new Entity('PachinkoPocketBar');
    pocketContainer.setLocalPosition(0, 80, 0);
    pocketContainer.addComponent('element', {
      type: 'group',
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0],
      width: 680,
      height: 54,
      ...layerOpt,
    });
    this.root.addChild(pocketContainer);

    const poolItems = [
      { name: 'GOKU [F]', rate: '10%', color: '#f59e0b' },
      { name: 'NARUTO [F]', rate: '15%', color: '#f97316' },
      { name: 'LUFFY [F]', rate: '25%', color: '#ef4444' },
      { name: 'EREN [F]', rate: '25%', color: '#10b981' },
      { name: 'L [F]', rate: '15%', color: '#0284c7' },
      { name: 'LELOUCH [F]', rate: '10%', color: '#a855f7' },
    ];

    const cardWidth = 108;
    const cardHeight = 52;
    const spacing = 6;
    const startX = -((6 * (cardWidth + spacing)) / 2) + cardWidth / 2 + spacing / 2;

    for (let i = 0; i < 6; i++) {
      const item = poolItems[i]!;
      const posX = startX + i * (cardWidth + spacing);

      const card = new Entity(`RewardPocketCard_${i}`);
      card.setLocalPosition(posX, 0, 0);
      card.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: cardWidth,
        height: cardHeight,
        color: colorFromHex('#0b1329'),
        opacity: 0.94,
        ...layerOpt,
      });
      pocketContainer.addChild(card);

      const cardTrim = new Entity(`PocketTrim_${i}`);
      cardTrim.setLocalPosition(0, 25, 0);
      cardTrim.addComponent('element', {
        type: 'image',
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        width: cardWidth - 4,
        height: 2,
        color: colorFromHex(item.color),
        ...layerOpt,
      });
      card.addChild(cardTrim);

      const label = new Entity(`PocketLabel_${i}`);
      label.setLocalPosition(0, 9, 0);
      label.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 12,
        text: item.name,
        color: colorFromHex(item.color),
        autoWidth: false,
        autoHeight: false,
        width: cardWidth - 4,
        height: 18,
        alignment: [0.5, 0.5],
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      card.addChild(label);

      const rateLabel = new Entity(`PocketRate_${i}`);
      rateLabel.setLocalPosition(0, -10, 0);
      rateLabel.addComponent('element', {
        type: 'text',
        fontAsset: this.fontAsset,
        fontSize: 12,
        text: item.rate,
        color: colorFromHex('#ffffff'),
        autoWidth: false,
        autoHeight: false,
        width: cardWidth - 4,
        height: 16,
        alignment: [0.5, 0.5],
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        ...layerOpt,
      });
      card.addChild(rateLabel);
    }
  }

  private setupHoldToDropListeners(): void {
    const startHold = () => {
      if (this.isHoldingDrop) return;
      this.isHoldingDrop = true;

      // Trigger initial drop immediately
      this.executeDrop();

      // Start rapid stream drop every 200ms while holding
      this.holdDropInterval = setInterval(() => {
        if (!this.isHoldingDrop) {
          clearInterval(this.holdDropInterval);
          return;
        }
        const success = this.executeDrop();
        if (!success) {
          this.stopHold();
        }
      }, 200);
    };

    const stopHold = () => {
      this.stopHold();
    };

    const elem = this.dropButton.element;
    if (elem) {
      elem.on('mousedown', startHold);
      elem.on('touchstart', startHold);
      elem.on('mouseup', stopHold);
      elem.on('touchend', stopHold);
      elem.on('mouseleave', stopHold);
      elem.on('touchcancel', stopHold);
    }

    window.addEventListener('mouseup', stopHold);
    window.addEventListener('touchend', stopHold);
  }

  private stopHold(): void {
    this.isHoldingDrop = false;
    if (this.holdDropInterval) {
      clearInterval(this.holdDropInterval);
      this.holdDropInterval = undefined;
    }
  }

  private executeDrop(): boolean {
    if (this.currentMedals <= 0) {
      this.showNotification('⚠️ OUT OF MEDALS! Collect Medals from Dealer or Campaign.', true);
      this.audio.playInspectorClose();
      this.stopHold();
      return false;
    }

    if (this.currentCampCount >= this.maxCampCapacity) {
      this.showNotification('⚠️ BATTLE CAMP FULL (36/36)! Merge or Release Summons first.', true);
      this.audio.playInspectorClose();
      this.stopHold();
      return false;
    }

    if (this.onDropBall) {
      const result = this.onDropBall();
      if (typeof result === 'boolean' && !result) {
        this.stopHold();
        return false;
      }
    }
    return true;
  }

  public showNotification(message: string, isError: boolean = false, durationMs: number = 2600): void {
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = undefined;
    }

    if (this.bannerText.element) {
      this.bannerText.element.text = message;
      this.bannerText.element.color = isError ? colorFromHex('#f87171') : colorFromHex('#4ade80');
    }

    this.bannerEntity.enabled = true;
    this.bannerTimer = setTimeout(() => {
      this.bannerEntity.enabled = false;
    }, durationMs);
  }

  updateState(
    medals: number,
    shieldCharges: number,
    isShieldActive: boolean,
    shieldRemainingMs: number = 0,
    campCount: number = 6,
    maxCamp: number = 36
  ): void {
    this.currentMedals = medals;
    this.currentCampCount = campCount;
    this.maxCampCapacity = maxCamp;

    if (this.statsBarText.element) {
      this.statsBarText.element.text = `メダル: ${medals} • CAMP: ${campCount}/${maxCamp}`;
    }

    if (this.shieldMeterText.element) {
      const bars = ['□', '□', '□', '□', '□'];
      for (let i = 0; i < shieldCharges && i < 5; i++) {
        bars[i] = '■';
      }
      const shieldStr = isShieldActive
        ? ` • SHIELD ACTIVE (${Math.ceil(shieldRemainingMs / 60000)}m)`
        : '';
      this.shieldMeterText.element.text = `SHIELD BUMPERS: [${bars.join('')}] ${shieldCharges}/5${shieldStr}`;
    }

    // Update Drop Button visual state if full or out of medals
    if (this.dropBtnText.element) {
      if (medals <= 0) {
        this.dropBtnText.element.text = 'OUT OF MEDALS ⚠️';
      } else if (campCount >= maxCamp) {
        this.dropBtnText.element.text = 'BATTLE CAMP FULL (36/36) ⚠️';
      } else {
        this.dropBtnText.element.text = 'PUSH (1 MEDAL) 🎰 • HOLD TO DROP';
      }
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.root.enabled = true;
    this.audio.playInspectorOpen();
  }

  close(suppressCallback: boolean = false): void {
    if (!this.isOpen && !this.root.enabled) return;
    this.stopHold();
    this.isOpen = false;
    this.root.enabled = false;
    this.bannerEntity.enabled = false;
    this.audio.playInspectorClose();
    if (!suppressCallback) {
      this.onClose?.();
    }
  }

  destroy(): void {
    this.stopHold();
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.root.destroy();
  }
}

