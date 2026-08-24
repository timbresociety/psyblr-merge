import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export type DropBallCallback = () => void;
export type PachinkoCloseCallback = () => void;

export class PachinkoHUD {
  public root: Entity;
  public isOpen: boolean = false;

  private dropButton: Entity;
  private closeButton: Entity;
  private titleText: Entity;
  private promptText: Entity;

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
    this.titleText.setLocalPosition(32, -32, 0);
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 22,
      text: 'SPAWN MATRIX  •  PACHINKO',
      color: new Color(0.96, 0.62, 0.04), // Amber Gold
      anchor: [0, 1, 0, 1], // Top-Left
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.titleText);

    // Sub-prompt
    this.promptText = new Entity('PachinkoPrompt');
    this.promptText.setLocalPosition(32, -64, 0);
    this.promptText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '6 CURATED STARTER REWARDS  •  F-TIER SPAWN',
      color: new Color(0.5, 0.65, 0.85),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.promptText);

    // 2. [BACK TO BASE] Button Top-Right
    this.closeButton = new Entity('PachinkoBackButton');
    this.closeButton.setLocalPosition(-32, -32, 0);
    this.closeButton.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: '[ BASE CAMP ]',
      color: new Color(0.8, 0.85, 0.95),
      anchor: [1, 1, 1, 1], // Top-Right
      pivot: [1, 1],
      useInput: true,
      ...layerOpt,
    });
    this.closeButton.element?.on('click', () => {
      this.close();
    });
    this.root.addChild(this.closeButton);

    // 3. [PULL LEVER & DROP BALL] Action Button Bottom-Right
    this.dropButton = new Entity('DropBallButton');
    this.dropButton.setLocalPosition(-48, 48, 0);
    this.dropButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0], // Bottom-Right
      pivot: [1, 0],
      width: 240,
      height: 54,
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
      text: 'PULL LEVER & DROP',
      color: new Color(0.05, 0.08, 0.16), // Dark text on gold
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.dropButton.addChild(btnText);

    this.dropButton.element?.on('click', () => {
      this.onDropBall?.();
    });

    // ESC key listener to dismiss
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
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
