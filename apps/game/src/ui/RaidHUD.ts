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

export class RaidHUD {
  public root: Entity;
  public isOpen: boolean = false;

  private startButton: Entity;
  private closeButton: Entity;
  private titleText: Entity;
  private statusText: Entity;

  public onStartCombat?: StartCombatCallback;
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

    // 1. Top Title Header
    this.titleText = new Entity('RaidTitle');
    this.titleText.setLocalPosition(32, -32, 0);
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 22,
      text: 'RAID GATE  •  2v2 DETERMINISTIC ARENA',
      color: new Color(0.94, 0.27, 0.27), // Crimson Red
      anchor: [0, 1, 0, 1], // Top-Left
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.titleText);

    // Sub-status text
    this.statusText = new Entity('RaidStatus');
    this.statusText.setLocalPosition(32, -64, 0);
    this.statusText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: 'PREPARATION: 2 PLAYER UNITS (Z >= 4)  •  2 ENEMY DEFENDERS (Z < 4)',
      color: new Color(0.7, 0.8, 0.95),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.statusText);

    // 2. [BASE CAMP] Close Button Top-Right
    this.closeButton = new Entity('RaidBackButton');
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

    // 3. [START COMBAT] Action Button Bottom-Right
    this.startButton = new Entity('StartCombatButton');
    this.startButton.setLocalPosition(-48, 48, 0);
    this.startButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0], // Bottom-Right
      pivot: [1, 0],
      width: 240,
      height: 54,
      color: new Color(0.88, 0.22, 0.22), // Crimson
      useInput: true,
      ...layerOpt,
    });
    this.root.addChild(this.startButton);

    const btnText = new Entity('StartBtnText');
    btnText.setLocalPosition(0, 0, 0);
    btnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'START 2v2 COMBAT',
      color: new Color(0.98, 0.98, 1.0),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.startButton.addChild(btnText);

    this.startButton.element?.on('click', () => {
      this.onStartCombat?.();
    });

    // ESC key listener to dismiss
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  setStatus(text: string, colorHex: string = '#f1f5f9'): void {
    if (this.statusText.element) {
      this.statusText.element.text = text;
      this.statusText.element.color = new Color().fromString(colorHex);
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
