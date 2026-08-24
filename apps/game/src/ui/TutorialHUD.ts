import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';

export class TutorialHUD {
  public root: Entity;
  private cardBg: Entity;
  private titleText: Entity;
  private bodyText: Entity;
  private actionButton: Entity;
  private actionBtnText: Entity;

  public onActionClick?: () => void;

  constructor(
    private app: Application,
    private fontAsset: Asset,
    screenEntity: Entity,
    private hudLayer?: Layer
  ) {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    this.root = new Entity('TutorialHUD_Root');
    this.root.setLocalPosition(0, 0, 0);
    screenEntity.addChild(this.root);

    // Tutorial Card Backdrop anchored at Top-Left (x: 24, y: -76)
    this.cardBg = new Entity('TutorialCardBackdrop');
    this.cardBg.setLocalPosition(24, -76, 0);
    this.cardBg.addComponent('element', {
      type: 'image',
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      width: 440,
      height: 96,
      color: new Color(0.04, 0.07, 0.16),
      opacity: 0.94,
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.cardBg);

    // Gold Left Accent Bar
    const leftBar = new Entity('CardLeftBar');
    leftBar.setLocalPosition(-218, 0, 0);
    leftBar.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 4,
      height: 96,
      color: new Color(0.96, 0.62, 0.04),
      ...layerOpt,
    });
    this.cardBg.addChild(leftBar);

    // Title (Y: +26)
    this.titleText = new Entity('TutorialCardTitle');
    this.titleText.setLocalPosition(-200, 26, 0);
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '✦ ONBOARDING TUTORIAL',
      color: new Color(0.96, 0.62, 0.04), // Gold
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.cardBg.addChild(this.titleText);

    // Body (Y: -10)
    this.bodyText = new Entity('TutorialCardBody');
    this.bodyText.setLocalPosition(-200, -10, 0);
    this.bodyText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 11,
      lineHeight: 16,
      wrapLines: true,
      width: 400,
      text: 'Follow the guided steps to master Combat, Camp Protection, Spawning, and Merging.',
      color: new Color(0.85, 0.9, 0.98),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.cardBg.addChild(this.bodyText);

    // Action button inside card (Y: -28)
    this.actionButton = new Entity('TutorialActionButton');
    this.actionButton.setLocalPosition(145, -28, 0);
    this.actionButton.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 110,
      height: 24,
      color: new Color(0.02, 0.52, 0.8),
      useInput: true,
      ...layerOpt,
    });
    this.cardBg.addChild(this.actionButton);

    this.actionBtnText = new Entity('ActionBtnText');
    this.actionBtnText.setLocalPosition(0, 0, 0);
    this.actionBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 10,
      text: 'CONTINUE →',
      color: new Color(1, 1, 1),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.actionButton.addChild(this.actionBtnText);

    this.actionButton.element?.on('click', () => this.onActionClick?.());
    this.actionButton.element?.on('touchend', () => this.onActionClick?.());
  }

  showStep(title: string, body: string, actionLabel?: string): void {
    this.root.enabled = true;
    if (this.titleText.element) {
      this.titleText.element.text = `✦ ${title.toUpperCase()}`;
    }
    if (this.bodyText.element) {
      this.bodyText.element.text = body;
    }
    if (actionLabel) {
      this.actionButton.enabled = true;
      if (this.actionBtnText.element) {
        this.actionBtnText.element.text = actionLabel;
      }
    } else {
      this.actionButton.enabled = false;
    }
  }

  hide(): void {
    this.root.enabled = false;
  }

  destroy(): void {
    this.root.destroy();
  }
}
