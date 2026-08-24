import {
  Application,
  CanvasFont,
  Color,
  Entity,
  Asset,
  SCALEMODE_BLEND,
  type Layer,
} from 'playcanvas';

export class HUDRoot {
  public screenEntity: Entity;
  public fontAsset: Asset | null = null;
  private font: CanvasFont | null = null;
  private badgeEntity: Entity | null = null;

  constructor(private app: Application, private hudLayer?: Layer) {
    this.screenEntity = new Entity('HUDRoot_Screen');

    // Create 2D Screen Space Root
    this.screenEntity.addComponent('screen', {
      screenSpace: true,
      referenceResolution: [1440, 900],
      scaleMode: SCALEMODE_BLEND,
      scaleBlend: 0.5,
    });
    this.app.root.addChild(this.screenEntity);

    this.initFont();
    this.buildHUD();
  }

  private initFont(): void {
    // Generate native PlayCanvas CanvasFont with high resolution
    this.font = new CanvasFont(this.app, {
      fontName: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 64,
      fontWeight: 'bold',
      color: new Color(1, 1, 1),
      padding: 6,
    });

    const characters =
      ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~©®•→←↑↓';
    this.font.createTextures(characters);

    this.fontAsset = new Asset('HUDCanvasFont', 'font', { url: '' });
    this.fontAsset.resource = this.font;
    this.fontAsset.loaded = true;
    this.app.assets.add(this.fontAsset);
  }

  private buildHUD(): void {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};
    const font = this.fontAsset;

    // Title: PSYBLR (Top-Left)
    const titleText = new Entity('TitleText');
    titleText.setLocalPosition(28, -26, 0);
    titleText.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 26,
      text: 'PSYBLR',
      color: new Color(0.96, 0.62, 0.04), // Amber gold
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.screenEntity.addChild(titleText);

    // Subtitle: BASE CAMP
    const subText = new Entity('SubText');
    subText.setLocalPosition(28, -56, 0);
    subText.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 12,
      text: 'BASE CAMP',
      color: new Color(0.58, 0.64, 0.72), // Slate 400
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.screenEntity.addChild(subText);

    // Top-Right Badge: V2 ALPHA 0.1
    this.badgeEntity = new Entity('BadgeEntity');
    this.badgeEntity.setLocalPosition(-28, -26, 0);
    this.badgeEntity.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 12,
      text: 'V2 ALPHA 0.1  •  DRAG SUMMON TO PLACE',
      color: new Color(0.45, 0.55, 0.70),
      anchor: [1, 1, 1, 1], // Top-Right
      pivot: [1, 1],
      ...layerOpt,
    });
    this.screenEntity.addChild(this.badgeEntity);
  }

  setBadgeVisible(visible: boolean): void {
    if (this.badgeEntity) {
      this.badgeEntity.enabled = visible;
    }
  }

  destroy(): void {
    this.screenEntity.destroy();
    if (this.fontAsset) {
      this.app.assets.remove(this.fontAsset);
      this.fontAsset.unload();
    }
  }
}
