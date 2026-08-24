import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';

export type DropBallCallback = () => void;
export type PachinkoCloseCallback = () => void;

export class PachinkoHUD {
  public root: Entity;
  public isOpen: boolean = false;

  private dropButton: Entity;
  private closeButton: Entity;
  private titleText: Entity;
  private promptText: Entity;
  private shieldMeterText: Entity;
  private ballsText: Entity;

  public onDropBall?: DropBallCallback;
  public onClose?: PachinkoCloseCallback;

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

    // 1. Top Title Header
    this.titleText = new Entity('PachinkoTitle');
    this.titleText.setLocalPosition(32, -28, 0);
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 22,
      text: 'SPAWN MATRIX • PLINKO GACHA',
      color: new Color(0.96, 0.62, 0.04), // Amber Gold
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.titleText);

    // Sub-prompt & Probability distribution
    this.promptText = new Entity('PachinkoPrompt');
    this.promptText.setLocalPosition(32, -58, 0);
    this.promptText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: 'SLOTS: 30% Goku(F) • 15% Naruto(E) • 5% Luffy(D) • 5% Eren(D) • 15% L(E) • 30% Lelouch(F)',
      color: new Color(0.65, 0.75, 0.9),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.promptText);

    // Shield Bumper Meter on Left-Center
    this.shieldMeterText = new Entity('PachinkoShieldMeter');
    this.shieldMeterText.setLocalPosition(32, -92, 0);
    this.shieldMeterText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'SHIELD BUMPERS: [□□□□□] 0/5 (Hit side bumpers to earn 1-hr shield)',
      color: new Color(0.2, 0.85, 0.95), // Cyan
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.shieldMeterText);

    // Balls available counter
    this.ballsText = new Entity('PachinkoBallsRemaining');
    this.ballsText.setLocalPosition(32, -120, 0);
    this.ballsText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'PLINKO BALLS REMAINING: 100',
      color: new Color(0.96, 0.75, 0.1),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.ballsText);

    // 2. [RETURN TO BASE] Button Top-Right (Clickable image target)
    this.closeButton = new Entity('PachinkoBackButton');
    this.closeButton.setLocalPosition(-32, -32, 0);
    this.closeButton.addComponent('element', {
      type: 'image',
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      width: 180,
      height: 38,
      color: new Color(0.12, 0.18, 0.32),
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.closeButton);

    const closeText = new Entity('PachinkoCloseText');
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
    this.closeButton.addChild(closeText);

    this.closeButton.element?.on('click', () => this.close());
    this.closeButton.element?.on('touchend', () => this.close());

    // 3. [PULL LEVER & DROP BALL] Action Button Bottom-Right
    this.dropButton = new Entity('DropBallButton');
    this.dropButton.setLocalPosition(-48, 48, 0);
    this.dropButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0],
      pivot: [1, 0],
      width: 250,
      height: 52,
      color: new Color(0.96, 0.62, 0.04), // Amber Gold
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.dropButton);

    const btnText = new Entity('DropBtnText');
    btnText.setLocalPosition(0, 0, 0);
    btnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'PULL LEVER & DROP (1 B) 🎰',
      color: new Color(0.05, 0.08, 0.16),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.dropButton.addChild(btnText);

    this.dropButton.element?.on('click', () => this.onDropBall?.());
    this.dropButton.element?.on('touchend', () => this.onDropBall?.());

    // ESC key listener to dismiss
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  updateState(balls: number, shieldCharges: number, isShieldActive: boolean, shieldRemainingMs: number = 0): void {
    if (this.ballsText.element) {
      this.ballsText.element.text = `PLINKO BALLS REMAINING: ${balls}`;
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
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
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
