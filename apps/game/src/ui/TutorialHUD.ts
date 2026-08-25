import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';

export interface TutorialStepOptions {
  stepNumber: number;
  totalSteps: number;
  phaseName: string;
  title: string;
  body: string;
  objective?: string;
  actionLabel?: string;
  accentColor?: string;
  showActionButton?: boolean;
}

export class TutorialHUD {
  public root: Entity;
  public onActionClick?: () => void;

  private bannerEntity: Entity;
  private borderTrim: Entity;
  private badgeText: Entity;
  private titleText: Entity;
  private messageText: Entity;
  private objectiveText: Entity;
  private actionButton: Entity;
  private actionBtnText: Entity;

  constructor(
    private app: Application,
    private fontAsset: Asset,
    screenEntity: Entity,
    private hudLayer?: Layer
  ) {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    this.root = new Entity('TutorialHUD_Root');
    this.root.enabled = false;
    screenEntity.addChild(this.root);

    // Sleek Floating Quest Banner at Bottom-Center (Y: 56px from bottom, Width: 800, Height: 104)
    this.bannerEntity = new Entity('TutorialQuestBanner');
    this.bannerEntity.setLocalPosition(0, 56, 0);
    this.bannerEntity.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0, 0.5, 0],
      pivot: [0.5, 0.5],
      width: 800,
      height: 104,
      color: colorFromHex('#070d1e'),
      opacity: 0.98,
      ...layerOpt,
    });
    this.root.addChild(this.bannerEntity);

    // Neon Accent Border Trim at Top of Card
    this.borderTrim = new Entity('TutorialBorderTrim');
    this.borderTrim.setLocalPosition(0, 51, 0);
    this.borderTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 796,
      height: 3,
      color: colorFromHex('#38bdf8'),
      ...layerOpt,
    });
    this.bannerEntity.addChild(this.borderTrim);

    // 1. Unified Step Badge & Title Header
    this.badgeText = new Entity('TutorialBadgeText');
    this.badgeText.setLocalPosition(-370, 32, 0);
    this.badgeText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: '✦ STEP 1/7: CAMPAIGN',
      color: colorFromHex('#fbbf24'),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0, 0.5],
      alignment: [0, 0.5],
      autoWidth: false,
      autoHeight: false,
      width: 530,
      height: 22,
      ...layerOpt,
    });
    this.bannerEntity.addChild(this.badgeText);

    // Dummy titleText entity retained for compatibility
    this.titleText = new Entity('TutorialTitleText');
    this.titleText.enabled = false;
    this.bannerEntity.addChild(this.titleText);

    // 2. Guidance Message Body (Multi-line wrapped text)
    this.messageText = new Entity('TutorialMessageText');
    this.messageText.setLocalPosition(-370, 4, 0);
    this.messageText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      lineHeight: 17,
      wrapLines: true,
      text: 'Instructions',
      color: colorFromHex('#f8fafc'),
      autoWidth: false,
      autoHeight: false,
      width: 530,
      height: 34,
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0, 0.5],
      alignment: [0, 0.5],
      ...layerOpt,
    });
    this.bannerEntity.addChild(this.messageText);

    // 3. Objective Tracker / Progress Note (Bottom row of text)
    this.objectiveText = new Entity('TutorialObjectiveText');
    this.objectiveText.setLocalPosition(-370, -28, 0);
    this.objectiveText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 11,
      text: '🎯 Objective: Deploy squad and tap START BATTLE',
      color: colorFromHex('#fbbf24'),
      autoWidth: false,
      autoHeight: false,
      width: 530,
      height: 20,
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0, 0.5],
      alignment: [0, 0.5],
      ...layerOpt,
    });
    this.bannerEntity.addChild(this.objectiveText);

    // 4. Action Button (Right-aligned, prominent high-contrast cyan/emerald pill)
    this.actionButton = new Entity('TutorialActionBtn');
    this.actionButton.setLocalPosition(285, -2, 0);
    this.actionButton.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 170,
      height: 48,
      color: colorFromHex('#0284c7'), // Vibrant Cyan Blue
      opacity: 1.0,
      useInput: true,
      ...layerOpt,
    });
    this.bannerEntity.addChild(this.actionButton);

    const btnBorder = new Entity('TutorialBtnBorder');
    btnBorder.setLocalPosition(0, 0, 0);
    btnBorder.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 166,
      height: 44,
      color: colorFromHex('#0369a1'),
      ...layerOpt,
    });
    this.actionButton.addChild(btnBorder);

    this.actionBtnText = new Entity('TutorialBtnText');
    this.actionBtnText.setLocalPosition(0, 0, 0);
    this.actionBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'CONTINUE →',
      color: colorFromHex('#ffffff'),
      autoWidth: false,
      autoHeight: false,
      width: 160,
      height: 40,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.actionButton.addChild(this.actionBtnText);

    const triggerAction = () => {
      this.onActionClick?.();
    };
    this.actionButton.element?.on('click', triggerAction);
    this.actionButton.element?.on('touchend', triggerAction);
    this.actionButton.element?.on('mousedown', triggerAction);
  }

  showStepDetails(options: TutorialStepOptions): void {
    this.root.enabled = true;

    const accent = options.accentColor ?? '#38bdf8';
    if (this.borderTrim.element) {
      this.borderTrim.element.color = colorFromHex(accent);
    }

    if (this.badgeText.element) {
      const cleanTitle = options.title.replace(/^\d+\.\s*/, '');
      this.badgeText.element.text = `✦ STEP ${options.stepNumber}/${options.totalSteps}: ${options.phaseName.toUpperCase()} — ${cleanTitle}`;
      this.badgeText.element.color = colorFromHex('#fbbf24');
    }

    if (this.messageText.element) {
      this.messageText.element.text = options.body;
    }

    if (this.objectiveText.element) {
      this.objectiveText.element.text = options.objective ?? '';
      this.objectiveText.element.color = options.objective ? colorFromHex('#fbbf24') : colorFromHex('#94a3b8');
    }

    const showBtn = options.showActionButton !== false;
    this.actionButton.enabled = showBtn;
    if (showBtn && this.actionBtnText.element && this.actionButton.element) {
      this.actionBtnText.element.text = options.actionLabel ?? 'CONTINUE →';
      this.actionButton.element.color = colorFromHex('#0284c7');
    }
  }

  /**
   * Compatibility method for simple step triggers.
   */
  showStep(title: string, body: string, actionLabel: string = 'CONTINUE →'): void {
    let stepNum = 1;
    const match = title.match(/^(\d+)\./);
    if (match) {
      stepNum = parseInt(match[1]!, 10);
    }

    this.showStepDetails({
      stepNumber: stepNum,
      totalSteps: 7,
      phaseName: title.replace(/^\d+\.\s*/, ''),
      title: title,
      body: body,
      actionLabel: actionLabel,
    });
  }

  updateObjective(objective: string, highlight: boolean = true): void {
    if (this.objectiveText.element) {
      this.objectiveText.element.text = objective;
      this.objectiveText.element.color = highlight ? colorFromHex('#fbbf24') : colorFromHex('#94a3b8');
    }
  }

  hide(): void {
    this.root.enabled = false;
  }

  destroy(): void {
    this.root.destroy();
  }
}
