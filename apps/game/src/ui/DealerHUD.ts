import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import type { AudioDirector } from '../presentation/AudioDirector';

export class DealerHUD {
  public root: Entity;
  public isOpen: boolean = false;

  private backdropCatcher: Entity;
  private panelBg: Entity;
  private headerText: Entity;
  private subText: Entity;
  private closeXBtn: Entity;
  private bodyText: Entity;
  private claimButton: Entity;
  private claimBtnText: Entity;
  private returnBtn: Entity;

  public onClaimBalls?: () => void;
  public onClose?: () => void;

  constructor(
    private app: Application,
    private audio: AudioDirector,
    private fontAsset: Asset,
    screenEntity: Entity,
    private hudLayer?: Layer
  ) {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    this.root = new Entity('DealerHUD_Root');
    this.root.enabled = false;
    screenEntity.addChild(this.root);
    this.root.setLocalPosition(0, 0, 0);

    // 1. Fullscreen transparent backdrop click catcher
    this.backdropCatcher = new Entity('DealerBackdropCatcher');
    this.root.addChild(this.backdropCatcher);
    this.backdropCatcher.addComponent('element', {
      type: 'image',
      anchor: [0, 0, 1, 1],
      pivot: [0.5, 0.5],
      color: new Color(0, 0, 0),
      opacity: 0.65,
      useInput: true,
      ...layerOpt,
    });
    this.backdropCatcher.setLocalPosition(0, 0, 0);
    this.backdropCatcher.element?.on('click', () => this.close());

    // 2. Center Modal Panel (640x380)
    this.panelBg = new Entity('DealerPanelBackdrop');
    this.root.addChild(this.panelBg);
    this.panelBg.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 640,
      height: 380,
      color: new Color(0.04, 0.08, 0.16),
      opacity: 0.98,
      useInput: true,
      ...layerOpt,
    });
    this.panelBg.setLocalPosition(0, 0, 0);

    // Top Emerald Border Trim
    const topTrim = new Entity('DealerTopTrim');
    this.panelBg.addChild(topTrim);
    topTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 640,
      height: 4,
      color: new Color(0.1, 0.8, 0.4),
      ...layerOpt,
    });
    topTrim.setLocalPosition(0, 188, 0);

    // Top-Right [X] Close Button
    this.closeXBtn = new Entity('DealerCloseXBtn');
    this.panelBg.addChild(this.closeXBtn);
    this.closeXBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 36,
      height: 36,
      color: new Color(0.15, 0.28, 0.25),
      useInput: true,
      ...layerOpt,
    });
    this.closeXBtn.setLocalPosition(280, 150, 0);

    const closeXText = new Entity('CloseXText');
    this.closeXBtn.addChild(closeXText);
    closeXText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 16,
      text: 'X',
      color: new Color(0.8, 0.9, 0.85),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    closeXText.setLocalPosition(0, 0, 0);
    this.closeXBtn.element?.on('click', () => this.close());

    // 3. Header Title (Top-Left: Y: 135)
    this.headerText = new Entity('DealerHeaderTitle');
    this.panelBg.addChild(this.headerText);
    this.headerText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 22,
      text: 'UNDERGROUND MEDAL DEALER',
      color: new Color(0.1, 0.85, 0.45),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.headerText.setLocalPosition(-280, 135, 0);

    // Subtitle (Y: 105)
    this.subText = new Entity('DealerSubText');
    this.panelBg.addChild(this.subText);
    this.subText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '24-HOUR GENERATION: 100 MEDALS OVER 12 TWO-HOUR EPOCHS',
      color: new Color(0.5, 0.65, 0.8),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.subText.setLocalPosition(-280, 105, 0);

    // 4. Body Content Box (Y: 10)
    this.bodyText = new Entity('DealerBodyText');
    this.panelBg.addChild(this.bodyText);
    this.bodyText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      lineHeight: 22,
      wrapLines: true,
      width: 560,
      text:
        'The Dealer produces 100 Medals continuously every 24 hours across 12 epochs.\n\n' +
        '• Generation Rate: Deterministic 2-hour accrual schedule.\n' +
        '• Stock Cap: 100 Medals stored maximum.\n' +
        '• Eligibility: Collection is enabled only when your wallet is below 100 Medals.\n' +
        '• Unclamped Transfer: Entire accumulated stock transfers into your wallet without clamp.',
      color: new Color(0.85, 0.9, 0.95),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.bodyText.setLocalPosition(0, 15, 0);

    // 5. Action Buttons (Bottom row)
    // Claim Button (Y: -90)
    this.claimButton = new Entity('DealerClaimButton');
    this.panelBg.addChild(this.claimButton);
    this.claimButton.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 320,
      height: 44,
      color: new Color(0.1, 0.75, 0.4),
      useInput: true,
      ...layerOpt,
    });
    this.claimButton.setLocalPosition(-90, -90, 0);

    this.claimBtnText = new Entity('ClaimBtnText');
    this.claimButton.addChild(this.claimBtnText);
    this.claimBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'COLLECT DEALER MEDALS',
      color: new Color(1, 1, 1),
      autoWidth: false,
      autoHeight: false,
      width: 320,
      height: 44,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.claimBtnText.setLocalPosition(0, 0, 0);

    const onClaim = () => this.onClaimBalls?.();
    this.claimButton.element?.on('click', onClaim);
    this.claimButton.element?.on('touchend', onClaim);

    // Return Button (Y: -90)
    this.returnBtn = new Entity('DealerReturnBtn');
    this.panelBg.addChild(this.returnBtn);
    this.returnBtn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 170,
      height: 44,
      color: new Color(0.2, 0.28, 0.42),
      useInput: true,
      ...layerOpt,
    });
    this.returnBtn.setLocalPosition(185, -90, 0);

    const retText = new Entity('DealerReturnText');
    this.returnBtn.addChild(retText);
    retText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '← RETURN',
      color: new Color(1, 1, 1),
      autoWidth: false,
      autoHeight: false,
      width: 170,
      height: 44,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    retText.setLocalPosition(0, 0, 0);

    this.returnBtn.element?.on('click', () => this.close());
    this.returnBtn.element?.on('touchend', () => this.close());

    // 6. Floating Success Celebration Toast
    this.successToastEntity = new Entity('DealerSuccessToast');
    this.panelBg.addChild(this.successToastEntity);
    this.successToastEntity.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 480,
      height: 48,
      color: new Color(0.04, 0.28, 0.16),
      opacity: 0.98,
      ...layerOpt,
    });
    this.successToastEntity.setLocalPosition(0, -35, 2);
    this.successToastEntity.enabled = false;

    const toastTrim = new Entity('DealerToastTrim');
    this.successToastEntity.addChild(toastTrim);
    toastTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 476,
      height: 2,
      color: new Color(0.2, 0.9, 0.5),
      ...layerOpt,
    });
    toastTrim.setLocalPosition(0, 23, 0);

    this.successToastText = new Entity('DealerToastText');
    this.successToastEntity.addChild(this.successToastText);
    this.successToastText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: '✨ +100 MEDALS COLLECTED INTO WALLET!',
      color: new Color(0.9, 1.0, 0.9),
      autoWidth: false,
      autoHeight: false,
      width: 460,
      height: 40,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.successToastText.setLocalPosition(0, 0, 0);

    // ESC key listener to exit
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  private successToastEntity: Entity;
  private successToastText: Entity;
  private successTimer?: any;

  showCollectionSuccess(medals: number): void {
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = undefined;
    }

    if (this.successToastText.element) {
      this.successToastText.element.text = `✨ +${medals} MEDALS TRANSFERRED TO WALLET!`;
    }

    this.successToastEntity.enabled = true;
    this.successTimer = setTimeout(() => {
      this.successToastEntity.enabled = false;
    }, 2800);
  }

  setStock(stock: number, canClaim: boolean = true, remainingMs: number = 0): void {
    if (this.claimBtnText.element && this.claimButton.element) {
      if (canClaim && stock > 0) {
        this.claimBtnText.element.text = `COLLECT ${stock} MEDALS 💰`;
        this.claimButton.element.color = new Color(0.1, 0.75, 0.4);
        this.claimButton.element.useInput = true;
      } else if (!canClaim && stock > 0) {
        this.claimBtnText.element.text = 'WALLET AT CAP (≥100) • SPEND MEDALS FIRST';
        this.claimButton.element.color = new Color(0.35, 0.28, 0.15);
        this.claimButton.element.useInput = false;
      } else {
        const hours = Math.floor(remainingMs / (60 * 60 * 1000));
        const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        const timerStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        this.claimBtnText.element.text = `STOCK ACCRUING (0 MEDALS) • NEXT: ${timerStr}`;
        this.claimButton.element.color = new Color(0.2, 0.25, 0.35);
        this.claimButton.element.useInput = false;
      }
    }
  }

  setClaimStatus(canClaim: boolean, remainingMs: number = 0): void {
    // Retained for backward compatibility
  }

  open(stock: number = 0, canClaim: boolean = true, remainingMs: number = 0): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.successToastEntity.enabled = false;
    this.setStock(stock, canClaim, remainingMs);
    this.root.enabled = true;
    this.audio.playInspectorOpen();
  }

  close(suppressCallback: boolean = false): void {
    if (!this.isOpen && !this.root.enabled) return;
    this.isOpen = false;
    this.successToastEntity.enabled = false;
    if (this.successTimer) clearTimeout(this.successTimer);
    this.root.enabled = false;
    this.audio.playInspectorClose();
    if (!suppressCallback) {
      this.onClose?.();
    }
  }

  destroy(): void {
    if (this.successTimer) clearTimeout(this.successTimer);
    this.root.destroy();
  }
}
