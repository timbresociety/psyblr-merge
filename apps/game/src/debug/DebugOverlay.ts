import {
  Application,
  CanvasFont,
  Color,
  Entity,
  Asset,
  SCALEMODE_BLEND,
  type Layer,
} from 'playcanvas';
import type { DragController } from '../interaction/DragController';
import type { SceneManager } from '../app/SceneManager';

export class DebugOverlay {
  public isVisible: boolean = false;
  private screenEntity: Entity;
  private statsTextEntity: Entity;
  private fontAsset: Asset | null = null;
  private font: CanvasFont | null = null;

  // FPS sampling
  private frameCount: number = 0;
  private sampleTime: number = 0;
  private currentFps: number = 60;
  private currentFrameMs: number = 16.6;

  private onKeyDownBound: (e: KeyboardEvent) => void;

  constructor(
    private app: Application,
    private dragController: DragController,
    private sceneManager: SceneManager,
    private debugLayer?: Layer
  ) {
    this.screenEntity = new Entity('DebugOverlay_Screen');
    this.screenEntity.enabled = false;

    const layerOpt = this.debugLayer ? { layers: [this.debugLayer.id] } : {};

    this.screenEntity.addComponent('screen', {
      screenSpace: true,
      referenceResolution: [1280, 720],
      scaleMode: SCALEMODE_BLEND,
      scaleBlend: 0.5,
    });
    this.app.root.addChild(this.screenEntity);

    this.initFont();

    // Stats Text panel on Bottom-Left
    this.statsTextEntity = new Entity('DebugStatsText');
    this.statsTextEntity.setLocalPosition(28, 24, 0);
    this.statsTextEntity.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 13,
      lineHeight: 18,
      text: 'DEBUG OVERLAY INITIALIZING...',
      color: new Color(0.2, 0.9, 0.4), // Emerald green
      anchor: [0, 0, 0, 0], // Bottom-Left
      pivot: [0, 0],
      ...layerOpt,
    });
    this.screenEntity.addChild(this.statsTextEntity);

    // Cheats Panel on Top-Right / Center-Right
    const cheatsPanel = new Entity('DebugCheatsPanel');
    cheatsPanel.setLocalPosition(-24, -80, 0);
    cheatsPanel.addComponent('element', {
      type: 'group',
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      width: 220,
      height: 380,
      ...layerOpt,
    });
    this.screenEntity.addChild(cheatsPanel);

    this.createCheatButton(cheatsPanel, 0, -10, 200, 32, '#1e293b', '#38bdf8', '+ Goku (F)', () => {
      this.onAddSummon?.('goku', 'F');
    });
    this.createCheatButton(cheatsPanel, 0, -50, 200, 32, '#1e293b', '#fb923c', '+ Naruto (F)', () => {
      this.onAddSummon?.('naruto', 'F');
    });
    this.createCheatButton(cheatsPanel, 0, -90, 200, 32, '#1e293b', '#a855f7', '+ Luffy (D)', () => {
      this.onAddSummon?.('luffy', 'D');
    });
    this.createCheatButton(cheatsPanel, 0, -130, 200, 32, '#1e293b', '#22c55e', '+ Eren (E)', () => {
      this.onAddSummon?.('eren', 'E');
    });
    this.createCheatButton(cheatsPanel, 0, -170, 200, 32, '#0f766e', '#ccfbf1', '⚡ Seed Merge Pairs', () => {
      this.onSeedMergePairs?.();
    });
    this.createCheatButton(cheatsPanel, 0, -210, 200, 32, '#d97706', '#fef3c7', '🎰 Open Pachinko', () => {
      this.onOpenPachinko?.();
    });
    this.createCheatButton(cheatsPanel, 0, -250, 200, 32, '#dc2626', '#fee2e2', '⚔️ Open Raid Arena', () => {
      this.onOpenRaid?.();
    });
    this.createCheatButton(cheatsPanel, 0, -290, 200, 32, '#475569', '#f1f5f9', '🔄 Reset To Starters', () => {
      this.onResetStarters?.();
    });

    this.onKeyDownBound = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDownBound);
  }

  private createCheatButton(
    parent: Entity,
    x: number,
    y: number,
    width: number,
    height: number,
    bgHex: string,
    textHex: string,
    label: string,
    onClick: () => void
  ): Entity {
    const layerOpt = this.debugLayer ? { layers: [this.debugLayer.id] } : {};
    const btn = new Entity(`CheatBtn_${label}`);
    btn.setLocalPosition(x, y, 0);
    btn.addComponent('element', {
      type: 'image',
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      width,
      height,
      color: new Color().fromString(bgHex),
      useInput: true,
      ...layerOpt,
    });

    const text = new Entity(`CheatText_${label}`);
    text.setLocalPosition(-width / 2, -height / 2, 0);
    text.addComponent('element', {
      type: 'text',
      fontAsset: this.fontAsset,
      fontSize: 11,
      text: label,
      color: new Color().fromString(textHex),
      anchor: [1, 1, 1, 1],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    btn.addChild(text);

    btn.element?.on('click', onClick);
    parent.addChild(btn);
    return btn;
  }

  public onAddSummon?: (definitionId: string, tier: string) => void;
  public onSeedMergePairs?: () => void;
  public onOpenPachinko?: () => void;
  public onOpenRaid?: () => void;
  public onResetStarters?: () => void;

  private initFont(): void {
    this.font = new CanvasFont(this.app, {
      fontName: 'monospace, Courier, monospace',
      fontSize: 32,
      fontWeight: 'bold',
      color: new Color(1, 1, 1),
      padding: 4,
    });

    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?-+/()[]{}#~_%$ <>|=';
    this.font.createTextures(characters);

    this.fontAsset = new Asset('DebugCanvasFont', 'font', { url: '' });
    this.fontAsset.resource = this.font;
    this.fontAsset.loaded = true;
    this.app.assets.add(this.fontAsset);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === '`' || e.key === '~' || e.key.toLowerCase() === 'd') {
      // Don't trigger if typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.toggle();
    }
  }

  toggle(): void {
    this.isVisible = !this.isVisible;
    this.screenEntity.enabled = this.isVisible;
  }

  update(dt: number): void {
    this.frameCount++;
    this.sampleTime += dt;

    if (this.sampleTime >= 0.25) {
      this.currentFps = Math.round(this.frameCount / this.sampleTime);
      this.currentFrameMs = Math.round((this.sampleTime / this.frameCount) * 10000) / 10;
      this.frameCount = 0;
      this.sampleTime = 0;
    }

    if (!this.isVisible) return;

    const draggedSummon = this.dragController.draggedSummon;
    const targetCell = this.dragController.hoveredTargetCell;
    const isDragging = this.dragController.isDragging;
    const primarySummon = this.sceneManager.summons[0];

    const lines = [
      `[PSYBLR V2 DEBUG] (Toggle: ~ / D)`,
      `FPS: ${this.currentFps}  |  Frame: ${this.currentFrameMs}ms`,
      `Camera: [0, 10.8, 12.5]  FOV: 42`,
      `Drag Active: ${isDragging ? 'YES' : 'NO'}`,
      `Dragged Summon: ${draggedSummon ? draggedSummon.instance.id : 'NONE'}`,
      `Target Camp Cell: ${targetCell ? `(${targetCell.x}, ${targetCell.y})` : 'NONE'}`,
      `Summon State: ${primarySummon ? primarySummon.state : 'N/A'}`,
      `Camp Cell: ${primarySummon ? `(${primarySummon.currentCell.x}, ${primarySummon.currentCell.y})` : 'N/A'}`,
    ];

    const element = this.statsTextEntity.element;
    if (element) {
      element.text = lines.join('\n');
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    this.screenEntity.destroy();
    if (this.fontAsset) {
      this.app.assets.remove(this.fontAsset);
      this.fontAsset.unload();
    }
  }
}
