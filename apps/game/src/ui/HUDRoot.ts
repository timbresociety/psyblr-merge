import {
  Application,
  CanvasFont,
  Color,
  Entity,
  Asset,
  SCALEMODE_BLEND,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';

export class HUDRoot {
  public screenEntity: Entity;
  public fontAsset: Asset | null = null;
  private font: CanvasFont | null = null;
  private brandContainer: Entity | null = null;
  private navContainerEntity: Entity | null = null;
  private statsContainer: Entity | null = null;
  private titleText: Entity | null = null;
  private subTextEntity: Entity | null = null;
  private medalsTextEntity: Entity | null = null;
  private shieldTextEntity: Entity | null = null;

  public onCampaignClick?: () => void;
  public onSpawnClick?: () => void;
  public onRaidClick?: () => void;
  public onDefenseClick?: () => void;
  public onDealerClick?: () => void;
  public onDebugClick?: () => void;

  constructor(private app: Application, private hudLayer?: Layer) {
    this.screenEntity = new Entity('HUDRoot_Screen');

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
    this.font = new CanvasFont(this.app, {
      fontName: 'sans-serif',
      fontSize: 32,
      fontWeight: 'bold',
      color: new Color(1, 1, 1),
      padding: 4,
      width: 1024,
      height: 1024,
    });

    const characters =
      ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~•✦★⚡メダル⚔️🛡️✨⚠️←→↑↓✓✔✕✖●○▲▼◀▶🎯💰□■🎰🏆’—↺🔍';
    this.font.createTextures(characters);

    this.fontAsset = new Asset('HUDCanvasFont', 'font', { url: '' });
    this.fontAsset.resource = this.font;
    this.fontAsset.loaded = true;
    this.app.assets.add(this.fontAsset);
  }

  private buildHUD(): void {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};
    const font = this.fontAsset;

    // 1. Title & Subtitle (Top-Left Floating Brand)
    this.brandContainer = new Entity('BrandContainer');
    this.brandContainer.setLocalPosition(24, -32, 0);
    this.brandContainer.addComponent('element', {
      type: 'group',
      anchor: [0, 1, 0, 1],
      pivot: [0, 0.5],
      width: 180,
      height: 56,
      ...layerOpt,
    });
    this.screenEntity.addChild(this.brandContainer);

    this.titleText = new Entity('TitleText');
    this.titleText.setLocalPosition(0, 13, 0);
    this.titleText.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 20,
      text: 'PSYBLR',
      color: colorFromHex('#fbbf24'), // Bright Anime Gold
      anchor: [0, 0.5, 0, 0.5],
      pivot: [0, 0.5],
      alignment: [0, 0.5],
      ...layerOpt,
    });
    this.brandContainer.addChild(this.titleText);

    this.subTextEntity = new Entity('SubText');
    this.subTextEntity.setLocalPosition(0, -13, 0);
    this.subTextEntity.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 13,
      text: 'BASE CAMP',
      color: colorFromHex('#94a3b8'),
      anchor: [0, 0.5, 0, 0.5],
      pivot: [0, 0.5],
      alignment: [0, 0.5],
      ...layerOpt,
    });
    this.brandContainer.addChild(this.subTextEntity);

    // 3. Sleek Navigation Pills Container (Centered)
    this.navContainerEntity = new Entity('TopNavContainer');
    this.navContainerEntity.setLocalPosition(0, -32, 0);
    this.navContainerEntity.addComponent('element', {
      type: 'group',
      anchor: [0.5, 1, 0.5, 1],
      pivot: [0.5, 0.5],
      width: 680,
      height: 44,
      ...layerOpt,
    });
    this.screenEntity.addChild(this.navContainerEntity);

    // Nav 1: [ CAMPAIGN ]
    const campBtn = this.createNavButton('Nav_CampBtn', -260, 0, 120, 36, '#0f223d', '#38bdf8', 'CAMPAIGN', () => {
      this.onCampaignClick?.();
    });
    this.navContainerEntity.addChild(campBtn);

    // Nav 2: [ SPAWN ]
    const spawnBtn = this.createNavButton('Nav_SpawnBtn', -130, 0, 120, 36, '#261a06', '#fbbf24', 'SPAWN', () => {
      this.onSpawnClick?.();
    });
    this.navContainerEntity.addChild(spawnBtn);

    // Nav 3: [ RAID ]
    const raidBtn = this.createNavButton('Nav_RaidBtn', 0, 0, 120, 36, '#310f17', '#f87171', 'RAID', () => {
      this.onRaidClick?.();
    });
    this.navContainerEntity.addChild(raidBtn);

    // Nav 4: [ DEFENSE ]
    const defBtn = this.createNavButton('Nav_DefBtn', 130, 0, 120, 36, '#240f3b', '#c084fc', 'DEFENSE', () => {
      this.onDefenseClick?.();
    });
    this.navContainerEntity.addChild(defBtn);

    // Nav 5: [ DEALER ]
    const dealerBtn = this.createNavButton('Nav_DealerBtn', 260, 0, 120, 36, '#06261c', '#34d399', 'DEALER', () => {
      this.onDealerClick?.();
    });
    this.navContainerEntity.addChild(dealerBtn);

    // 4. Stats & Shield Container (Top-Right)
    this.statsContainer = new Entity('StatsContainer');
    this.statsContainer.setLocalPosition(-24, -32, 0);
    this.statsContainer.addComponent('element', {
      type: 'group',
      anchor: [1, 1, 1, 1],
      pivot: [1, 0.5],
      width: 320,
      height: 56,
      ...layerOpt,
    });
    this.screenEntity.addChild(this.statsContainer);

    // Medals Badge (Top)
    this.medalsTextEntity = new Entity('MedalsText');
    this.medalsTextEntity.setLocalPosition(0, 13, 0);
    this.medalsTextEntity.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 16,
      text: 'メダル MEDALS: 100',
      color: colorFromHex('#fbbf24'), // Bright Gold
      anchor: [1, 0.5, 1, 0.5],
      pivot: [1, 0.5],
      alignment: [1, 0.5],
      ...layerOpt,
    });
    this.statsContainer.addChild(this.medalsTextEntity);

    // Time Shield Badge (Bottom)
    this.shieldTextEntity = new Entity('ShieldText');
    this.shieldTextEntity.setLocalPosition(0, -13, 0);
    this.shieldTextEntity.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 15,
      text: 'SHIELD: INACTIVE',
      color: colorFromHex('#ffffff'), // Crisp Pure White
      anchor: [1, 0.5, 1, 0.5],
      pivot: [1, 0.5],
      alignment: [1, 0.5],
      ...layerOpt,
    });
    this.statsContainer.addChild(this.shieldTextEntity);
  }

  private createNavButton(
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    bgColorHex: string,
    accentColorHex: string,
    labelText: string,
    onClick: () => void
  ): Entity {
    const layerOpt = this.hudLayer ? { layers: [this.hudLayer.id] } : {};
    const font = this.fontAsset;

    const btn = new Entity(name);
    btn.setLocalPosition(x, y, 0);
    btn.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width,
      height,
      color: colorFromHex(bgColorHex),
      opacity: 0.95,
      useInput: true,
      ...layerOpt,
    });

    // Top accent border trim
    const trim = new Entity(`${name}_Trim`);
    trim.setLocalPosition(0, height / 2 - 1, 0);
    trim.addComponent('element', {
      type: 'image',
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: width - 4,
      height: 2,
      color: colorFromHex(accentColorHex),
      ...layerOpt,
    });
    btn.addChild(trim);

    const text = new Entity(`${name}_Text`);
    text.setLocalPosition(0, 0, 0);
    text.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 14,
      text: labelText,
      color: colorFromHex('#ffffff'), // Crisp White
      autoWidth: false,
      autoHeight: false,
      width: width,
      height: height,
      alignment: [0.5, 0.5],
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    btn.addChild(text);

    btn.element?.on('click', onClick);
    btn.element?.on('touchend', onClick);

    return btn;
  }

  setNavVisible(visible: boolean): void {
    if (this.brandContainer) this.brandContainer.enabled = visible;
    if (this.navContainerEntity) this.navContainerEntity.enabled = visible;
    if (this.statsContainer) this.statsContainer.enabled = visible;
  }

  setSubtitle(text: string, colorHex?: string): void {
    if (this.subTextEntity?.element) {
      this.subTextEntity.element.text = text;
      this.subTextEntity.element.color = colorFromHex(colorHex ?? '#38bdf8');
    }
  }

  updateBallsDisplay(medals: number): void {
    this.updateMedalsDisplay(medals);
  }

  updateMedalsDisplay(medals: number): void {
    if (this.medalsTextEntity?.element) {
      this.medalsTextEntity.element.text = `メダル MEDALS: ${medals}`;
    }
  }

  updateShieldDisplay(isActive: boolean, remainingMs: number = 0): void {
    if (this.shieldTextEntity?.element) {
      if (isActive && remainingMs > 0) {
        const mins = Math.ceil(remainingMs / (60 * 1000));
        this.shieldTextEntity.element.text = `SHIELD: ACTIVE (${mins}m)`;
        this.shieldTextEntity.element.color = colorFromHex('#4ade80'); // Bright Emerald Green
      } else {
        this.shieldTextEntity.element.text = 'SHIELD: INACTIVE';
        this.shieldTextEntity.element.color = colorFromHex('#ffffff'); // Crisp Pure White
      }
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
