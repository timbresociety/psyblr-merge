import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { OpponentSummonEntry } from '../world/OpponentCampWorld';
import { getSummonDefinition } from '@psyblr/game-content';

export class OpponentCampHUD {
  public root: Entity;
  public isOpen: boolean = false;

  private topBar: Entity;
  private titleText: Entity;
  private statusText: Entity;
  private selectedText: Entity;
  private stealButton: Entity;
  private stealBtnText: Entity;
  private closeButton: Entity;

  public onClaimSteal?: () => void;
  public onClose?: () => void;

  constructor(
    private app: Application,
    private audio: AudioDirector,
    private fontAsset: Asset,
    screenEntity: Entity,
    private hudLayer?: Layer
  ) {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};

    this.root = new Entity('OpponentCampHUD_Root');
    this.root.enabled = false;
    this.root.setLocalPosition(0, 0, 0);
    screenEntity.addChild(this.root);

    // 1. Top Title Header
    this.topBar = new Entity('OppCampTopBar');
    this.topBar.setLocalPosition(0, -32, 0);
    this.topBar.addComponent('element', {
      type: 'group',
      anchor: [0, 1, 1, 1],
      pivot: [0.5, 1],
      height: 72,
      ...layerOpt,
    });
    this.root.addChild(this.topBar);

    this.titleText = new Entity('OppCampTitle');
    this.titleText.setLocalPosition(32, 8, 0);
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 20,
      text: 'OPPONENT CAMP • RAID VICTORY SPOILS',
      color: new Color(0.96, 0.62, 0.04), // Gold
      anchor: [0, 0.5, 0, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.topBar.addChild(this.titleText);

    this.statusText = new Entity('OppCampStatus');
    this.statusText.setLocalPosition(32, -18, 0);
    this.statusText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: 'Illuminati Row 0 is protected. Tap any exposed Summon in Rows 1-5 to steal into your Camp.',
      color: new Color(0.75, 0.85, 0.95),
      anchor: [0, 0.5, 0, 0.5],
      pivot: [0, 0.5],
      ...layerOpt,
    });
    this.topBar.addChild(this.statusText);

    // [RETURN TO BASE] Button Top-Right
    this.closeButton = new Entity('OppCampBackButton');
    this.closeButton.setLocalPosition(-110, 0, 0);
    this.closeButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0.5, 1, 0.5],
      pivot: [0.5, 0.5],
      width: 180,
      height: 38,
      color: new Color(0.12, 0.18, 0.32),
      useInput: true,
      ...layerOpt,
    });
    this.topBar.addChild(this.closeButton);

    const closeText = new Entity('OppCloseText');
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

    // Selected Target Banner on Left
    this.selectedText = new Entity('OppSelectedText');
    this.selectedText.setLocalPosition(32, -92, 0);
    this.selectedText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'SELECT AN EXPOSED SUMMON TO CLAIM',
      color: new Color(0.2, 0.9, 0.5), // Emerald
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.root.addChild(this.selectedText);

    // 2. [CLAIM & STEAL] Action Button Bottom-Right
    this.stealButton = new Entity('ClaimStealButton');
    this.stealButton.setLocalPosition(-48, 48, 0);
    this.stealButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0],
      pivot: [1, 0],
      width: 260,
      height: 52,
      color: new Color(0.15, 0.2, 0.3),
      useInput: false,
      ...layerOpt,
    });
    this.root.addChild(this.stealButton);

    this.stealBtnText = new Entity('StealBtnText');
    this.stealBtnText.setLocalPosition(0, 0, 0);
    this.stealBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'CLAIM & STEAL SUMMON 🏆',
      color: new Color(0.5, 0.6, 0.7),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.stealButton.addChild(this.stealBtnText);

    const onClaim = () => this.onClaimSteal?.();
    this.stealButton.element?.on('click', onClaim);
    this.stealButton.element?.on('touchend', onClaim);

    // ESC key listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  setSelectedSummon(entry: OpponentSummonEntry | null): void {
    if (!entry) {
      if (this.selectedText.element) {
        this.selectedText.element.text = 'SELECT AN EXPOSED SUMMON TO CLAIM';
        this.selectedText.element.color = new Color(0.6, 0.7, 0.85);
      }
      if (this.stealButton.element && this.stealBtnText.element) {
        this.stealButton.element.color = new Color(0.15, 0.2, 0.3);
        this.stealButton.element.useInput = false;
        this.stealBtnText.element.color = new Color(0.5, 0.6, 0.7);
      }
      return;
    }

    const def = getSummonDefinition(entry.instance.definitionId);
    if (this.selectedText.element) {
      this.selectedText.element.text = `TARGET SELECTED: ${def.displayName.toUpperCase()} [${entry.instance.tier}]`;
      this.selectedText.element.color = new Color(0.2, 0.9, 0.5);
    }
    if (this.stealButton.element && this.stealBtnText.element) {
      this.stealButton.element.color = new Color(0.96, 0.62, 0.04);
      this.stealButton.element.useInput = true;
      this.stealBtnText.element.color = new Color(0.05, 0.08, 0.16);
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.setSelectedSummon(null);
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
