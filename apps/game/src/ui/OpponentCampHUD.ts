import {
  Application,
  Color,
  Entity,
  Asset,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { OpponentSummonEntry } from '../world/OpponentCampWorld';
import { getSummonDefinition } from '@psyblr/game-content';

export class OpponentCampHUD {
  public root: Entity;
  public isOpen: boolean = false;
  public selectedEntry: OpponentSummonEntry | null = null;

  private topBar: Entity;
  private titleText: Entity;
  private statusText: Entity;
  private selectedText: Entity;
  private inspectButton: Entity;
  private inspectBtnText: Entity;
  private stealButton: Entity;
  private stealBtnText: Entity;
  private closeButton: Entity;

  public onClaimSteal?: () => void;
  public onInspectSummon?: (entry: OpponentSummonEntry) => void;
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

    // 1. Top Header Bar (Height 80px)
    this.topBar = new Entity('OppCampTopBar');
    this.topBar.addComponent('element', {
      type: 'group',
      anchor: [0, 1, 1, 1],
      pivot: [0, 1],
      height: 80,
      ...layerOpt,
    });
    this.root.addChild(this.topBar);
    this.topBar.setLocalPosition(0, 0, 0);

    this.titleText = new Entity('OppCampTitle');
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 20,
      text: 'OPPONENT CAMP • RAID VICTORY SPOILS',
      color: colorFromHex('#fbbf24'), // Anime Gold
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.topBar.addChild(this.titleText);
    this.titleText.setLocalPosition(32, -24, 0);

    this.statusText = new Entity('OppCampStatus');
    this.statusText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'Illuminati Row 0 is protected. Tap any exposed Summon in Rows 1-5 to steal into your Camp.',
      color: colorFromHex('#94a3b8'), // Slate Gray
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.topBar.addChild(this.statusText);
    this.statusText.setLocalPosition(32, -54, 0);

    // [RETURN TO BASE] Button Top-Right
    this.closeButton = new Entity('OppCampBackButton');
    this.closeButton.addComponent('element', {
      type: 'image',
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      width: 180,
      height: 38,
      color: colorFromHex('#0f172a'),
      useInput: true,
      ...layerOpt,
    });
    this.topBar.addChild(this.closeButton);
    this.closeButton.setLocalPosition(-32, -24, 0);

    const closeTrim = new Entity('OppBackTrim');
    closeTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 176,
      height: 2,
      color: colorFromHex('#38bdf8'),
      ...layerOpt,
    });
    this.closeButton.addChild(closeTrim);
    closeTrim.setLocalPosition(0, 18, 0);

    const closeText = new Entity('OppCloseText');
    closeText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 12,
      text: '← RETURN TO BASE',
      color: colorFromHex('#f8fafc'),
      autoWidth: false,
      autoHeight: false,
      width: 180,
      height: 38,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.closeButton.addChild(closeText);
    closeText.setLocalPosition(0, 0, 0);

    this.closeButton.element?.on('click', () => this.close());
    this.closeButton.element?.on('touchend', () => this.close());

    // Selected Target Banner (Sub-header)
    this.selectedText = new Entity('OppSelectedText');
    this.selectedText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 14,
      text: 'TAP ANY EXPOSED SUMMON IN ROWS 1-5 TO SELECT FOR STEAL',
      color: colorFromHex('#64748b'),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.topBar.addChild(this.selectedText);
    this.selectedText.setLocalPosition(32, -84, 0);

    // 2. [INSPECT SUMMON] Button Bottom-Right
    this.inspectButton = new Entity('InspectSummonButton');
    this.inspectButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0],
      pivot: [1, 0],
      width: 200,
      height: 52,
      color: colorFromHex('#0f172a'),
      useInput: false,
      ...layerOpt,
    });
    this.root.addChild(this.inspectButton);
    this.inspectButton.setLocalPosition(-300, 48, 0);

    const inspectTrim = new Entity('InspectBtnTrim');
    inspectTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 196,
      height: 2,
      color: colorFromHex('#38bdf8'),
      ...layerOpt,
    });
    this.inspectButton.addChild(inspectTrim);
    inspectTrim.setLocalPosition(0, 25, 0);

    this.inspectBtnText = new Entity('InspectBtnText');
    this.inspectBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: '🔍 INSPECT STATS',
      color: colorFromHex('#64748b'),
      autoWidth: false,
      autoHeight: false,
      width: 200,
      height: 52,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.inspectButton.addChild(this.inspectBtnText);
    this.inspectBtnText.setLocalPosition(0, 0, 0);

    const onInspect = () => {
      if (this.selectedEntry) {
        this.onInspectSummon?.(this.selectedEntry);
      }
    };
    this.inspectButton.element?.on('click', onInspect);
    this.inspectButton.element?.on('touchend', onInspect);

    // 3. [CLAIM & STEAL] Action Button Bottom-Right
    this.stealButton = new Entity('ClaimStealButton');
    this.stealButton.addComponent('element', {
      type: 'image',
      anchor: [1, 0, 1, 0],
      pivot: [1, 0],
      width: 240,
      height: 52,
      color: colorFromHex('#1e293b'),
      useInput: false,
      ...layerOpt,
    });
    this.root.addChild(this.stealButton);
    this.stealButton.setLocalPosition(-48, 48, 0);

    const stealTrim = new Entity('ClaimStealTrim');
    stealTrim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: 236,
      height: 2,
      color: colorFromHex('#f59e0b'),
      ...layerOpt,
    });
    this.stealButton.addChild(stealTrim);
    stealTrim.setLocalPosition(0, 25, 0);

    this.stealBtnText = new Entity('StealBtnText');
    this.stealBtnText.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      text: 'CLAIM & STEAL 🏆',
      color: colorFromHex('#64748b'),
      autoWidth: false,
      autoHeight: false,
      width: 240,
      height: 52,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    this.stealButton.addChild(this.stealBtnText);
    this.stealBtnText.setLocalPosition(0, 0, 0);

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

  showProtectedNotice(entry: OpponentSummonEntry): void {
    this.selectedEntry = entry;
    const def = getSummonDefinition(entry.instance.definitionId);

    if (this.selectedText.element) {
      this.selectedText.element.text = `⚠️ ILLUMINATI PROTECTED: ${def.displayName.toUpperCase()} [${entry.instance.tier}] IS SHIELDED (ROW 0)`;
      this.selectedText.element.color = colorFromHex('#f59e0b');
    }

    if (this.inspectButton.element && this.inspectBtnText.element) {
      this.inspectButton.element.color = colorFromHex('#0f172a');
      this.inspectButton.element.useInput = true;
      this.inspectBtnText.element.color = colorFromHex('#38bdf8');
    }

    if (this.stealButton.element && this.stealBtnText.element) {
      this.stealButton.element.color = colorFromHex('#1e293b');
      this.stealButton.element.useInput = false;
      this.stealBtnText.element.color = colorFromHex('#64748b');
    }
  }

  setSelectedSummon(entry: OpponentSummonEntry | null): void {
    this.selectedEntry = entry;

    if (!entry) {
      if (this.selectedText.element) {
        this.selectedText.element.text = 'TAP ANY EXPOSED SUMMON IN ROWS 1-5 TO SELECT FOR STEAL';
        this.selectedText.element.color = colorFromHex('#64748b');
      }
      if (this.inspectButton.element && this.inspectBtnText.element) {
        this.inspectButton.element.color = colorFromHex('#1e293b');
        this.inspectButton.element.useInput = false;
        this.inspectBtnText.element.color = colorFromHex('#64748b');
      }
      if (this.stealButton.element && this.stealBtnText.element) {
        this.stealButton.element.color = colorFromHex('#1e293b');
        this.stealButton.element.useInput = false;
        this.stealBtnText.element.color = colorFromHex('#64748b');
      }
      return;
    }

    const def = getSummonDefinition(entry.instance.definitionId);
    if (this.selectedText.element) {
      this.selectedText.element.text = `TARGET SELECTED: ${def.displayName.toUpperCase()} [${entry.instance.tier}] • READY TO STEAL`;
      this.selectedText.element.color = colorFromHex('#34d399');
    }

    if (this.inspectButton.element && this.inspectBtnText.element) {
      this.inspectButton.element.color = colorFromHex('#0f172a');
      this.inspectButton.element.useInput = true;
      this.inspectBtnText.element.color = colorFromHex('#38bdf8');
    }

    if (this.stealButton.element && this.stealBtnText.element) {
      this.stealButton.element.color = colorFromHex('#fbbf24');
      this.stealButton.element.useInput = true;
      this.stealBtnText.element.color = colorFromHex('#050a17');
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.setSelectedSummon(null);
    this.root.enabled = true;
    this.audio.playInspectorOpen();
  }

  close(suppressCallback: boolean = false): void {
    if (!this.isOpen && !this.root.enabled) return;
    this.isOpen = false;
    this.root.enabled = false;
    this.audio.playInspectorClose();
    if (!suppressCallback) {
      this.onClose?.();
    }
  }

  destroy(): void {
    this.root.destroy();
  }
}
