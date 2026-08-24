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

    this.onKeyDownBound = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDownBound);
  }

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
