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

    const xText = new Entity('DealerXText');
    this.closeXBtn.addChild(xText);
    xText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 16,
      text: 'X',
      color: new Color(0.9, 1, 0.95),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    xText.setLocalPosition(0, 0, 0);

    this.closeXBtn.element?.on('click', () => this.close());
    this.closeXBtn.element?.on('touchend', () => this.close());

    // Header Title (Y: +140)
    this.headerText = new Entity('DealerTitle');
    this.panelBg.addChild(this.headerText);
    this.headerText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 18,
      text: "DEALER'S PLINKO SUPPLIES",
      color: new Color(0.2, 0.9, 0.5),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.headerText.setLocalPosition(0, 140, 0);

    // Subtitle (Y: +110)
    this.subText = new Entity('DealerSub');
    this.panelBg.addChild(this.subText);
    this.subText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 11,
      text: 'Daily Supply Drop • Generates 100 Plinko balls every 24 hours',
      color: new Color(0.7, 0.85, 0.8),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.subText.setLocalPosition(0, 110, 0);

    // Body text (Y: +25)
    this.bodyText = new Entity('DealerBody');
    this.panelBg.addChild(this.bodyText);
    this.bodyText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      lineHeight: 22,
      wrapLines: true,
      width: 540,
      text:
        'Greetings, Summoner!\n\nI deliver 100 free Plinko balls every 24 hours to fuel your Spawn Machine.\nUse them to summon new fighters, hit side bumpers to charge 1-hour Shields, and safeguard your Battle Camp from raiders!',
      color: new Color(0.95, 0.98, 1.0),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.bodyText.setLocalPosition(0, 25, 0);

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
      text: 'CLAIM 100 PLINKO BALLS',
      color: new Color(1, 1, 1),
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
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    retText.setLocalPosition(0, 0, 0);

    this.returnBtn.element?.on('click', () => this.close());
    this.returnBtn.element?.on('touchend', () => this.close());

    // ESC key listener to exit
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  setClaimStatus(canClaim: boolean, remainingMs: number = 0): void {
    if (this.claimBtnText.element && this.claimButton.element) {
      if (canClaim) {
        this.claimBtnText.element.text = 'CLAIM 100 PLINKO BALLS';
        this.claimButton.element.color = new Color(0.1, 0.75, 0.4);
        this.claimButton.element.useInput = true;
      } else {
        const hours = Math.floor(remainingMs / (60 * 60 * 1000));
        const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        this.claimBtnText.element.text = `CLAIMED (${hours}h ${mins}m)`;
        this.claimButton.element.color = new Color(0.28, 0.35, 0.45);
        this.claimButton.element.useInput = false;
      }
    }
  }

  open(canClaim: boolean = true, remainingMs: number = 0): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.setClaimStatus(canClaim, remainingMs);
    this.root.enabled = true;
    this.audio.playInspectorOpen();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.enabled = false;
    this.audio.playInspectorClose();
    this.onClose?.();
  }

  destroy(): void {
    this.root.destroy();
  }
}
