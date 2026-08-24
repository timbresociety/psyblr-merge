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
  private subTextEntity: Entity | null = null;
  private navContainerEntity: Entity | null = null;
  private ballsTextEntity: Entity | null = null;
  private shieldTextEntity: Entity | null = null;

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
      fontName: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 64,
      fontWeight: 'bold',
      color: new Color(1, 1, 1),
      padding: 6,
    });

    const characters =
      ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~©®•→←↑↓✦🛡🎱⚔️🎰🏰⚙️';
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
    titleText.setLocalPosition(28, -24, 0);
    titleText.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 24,
      text: 'PSYBLR',
      color: new Color(0.96, 0.62, 0.04), // Amber gold
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.screenEntity.addChild(titleText);

    // Subtitle: BASE CAMP
    this.subTextEntity = new Entity('SubText');
    this.subTextEntity.setLocalPosition(28, -52, 0);
    this.subTextEntity.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 12,
      text: 'BASE CAMP • HOME',
      color: new Color(0.58, 0.64, 0.72),
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      ...layerOpt,
    });
    this.screenEntity.addChild(this.subTextEntity);

    // Top Navigation Container (Centered horizontally)
    this.navContainerEntity = new Entity('TopNavContainer');
    this.navContainerEntity.setLocalPosition(0, -20, 0);
    this.navContainerEntity.addComponent('element', {
      type: 'group',
      anchor: [0.5, 1, 0.5, 1],
      pivot: [0.5, 1],
      width: 780,
      height: 40,
      ...layerOpt,
    });
    this.screenEntity.addChild(this.navContainerEntity);

    // Nav 1: [ ⚔️ CAMPAIGN ]
    const campaignBtn = this.createNavButton('Nav_CampBtn', -280, 0, 130, 34, '#0284c7', '#f0f9ff', 'CAMPAIGN', () => {
      this.onCampaignClick?.();
    });
    this.navContainerEntity.addChild(campaignBtn);

    // Nav 2: [ 🎰 SPAWN PLINKO ]
    const spawnBtn = this.createNavButton('Nav_SpawnBtn', -140, 0, 130, 34, '#f59e0b', '#0f172a', 'SPAWN (PLINKO)', () => {
      this.onSpawnClick?.();
    });
    this.navContainerEntity.addChild(spawnBtn);

    // Nav 3: [ ⚔️ RAID ARENA ]
    const raidBtn = this.createNavButton('Nav_RaidBtn', 0, 0, 130, 34, '#ef4444', '#f8fafc', 'RAID ARENA', () => {
      this.onRaidClick?.();
    });
    this.navContainerEntity.addChild(raidBtn);

    // Nav 4: [ 🛡️ DEFENSE ]
    const defBtn = this.createNavButton('Nav_DefBtn', 140, 0, 130, 34, '#6366f1', '#f5f3ff', 'DEFENSE SQUAD', () => {
      this.onDefenseClick?.();
    });
    this.navContainerEntity.addChild(defBtn);

    // Nav 5: [ 🎁 DEALER ]
    const dealerBtn = this.createNavButton('Nav_DealerBtn', 280, 0, 130, 34, '#10b981', '#064e3b', 'DEALER (100 B)', () => {
      this.onDealerClick?.();
    });
    this.navContainerEntity.addChild(dealerBtn);

    // Top-Right Badges: Balls Counter & Shield Indicator
    const statsContainer = new Entity('StatsContainer');
    statsContainer.setLocalPosition(-24, -20, 0);
    statsContainer.addComponent('element', {
      type: 'group',
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      width: 280,
      height: 60,
      ...layerOpt,
    });
    this.screenEntity.addChild(statsContainer);

    this.ballsTextEntity = new Entity('BallsText');
    this.ballsTextEntity.setLocalPosition(0, 0, 0);
    this.ballsTextEntity.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 14,
      text: 'PLINKO BALLS: 100',
      color: new Color(0.96, 0.62, 0.04), // Amber gold
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      ...layerOpt,
    });
    statsContainer.addChild(this.ballsTextEntity);

    this.shieldTextEntity = new Entity('ShieldText');
    this.shieldTextEntity.setLocalPosition(0, -24, 0);
    this.shieldTextEntity.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 12,
      text: 'SHIELD: INACTIVE',
      color: new Color(0.5, 0.65, 0.8),
      anchor: [1, 1, 1, 1],
      pivot: [1, 1],
      ...layerOpt,
    });
    statsContainer.addChild(this.shieldTextEntity);
  }

  private createNavButton(
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    bgColorHex: string,
    textColorHex: string,
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
      color: new Color().fromString(bgColorHex),
      useInput: true,
      ...layerOpt,
    });

    const text = new Entity(`${name}_Text`);
    text.setLocalPosition(0, 0, 0);
    text.addComponent('element', {
      type: 'text',
      fontAsset: font,
      fontSize: 11,
      text: labelText,
      color: new Color().fromString(textColorHex),
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      ...layerOpt,
    });
    btn.addChild(text);

    btn.element?.on('click', onClick);
    btn.element?.on('touchend', onClick);

    return btn;
  }

  public onCampaignClick?: () => void;
  public onSpawnClick?: () => void;
  public onRaidClick?: () => void;
  public onDefenseClick?: () => void;
  public onDealerClick?: () => void;
  public onDebugClick?: () => void;

  setNavVisible(visible: boolean): void {
    if (this.navContainerEntity) {
      this.navContainerEntity.enabled = visible;
    }
  }

  setSubtitle(text: string, colorHex: string = '#94a3b8'): void {
    if (this.subTextEntity?.element) {
      this.subTextEntity.element.text = text;
      this.subTextEntity.element.color = new Color().fromString(colorHex);
    }
  }

  updateBallsDisplay(balls: number): void {
    if (this.ballsTextEntity?.element) {
      this.ballsTextEntity.element.text = `PLINKO BALLS: ${balls}`;
    }
  }

  updateShieldDisplay(isActive: boolean, remainingMs: number = 0): void {
    if (this.shieldTextEntity?.element) {
      if (isActive && remainingMs > 0) {
        const mins = Math.ceil(remainingMs / (60 * 1000));
        this.shieldTextEntity.element.text = `SHIELD ACTIVE (${mins}m)`;
        this.shieldTextEntity.element.color = new Color(0.2, 0.9, 0.5); // Emerald green
      } else {
        this.shieldTextEntity.element.text = 'SHIELD: INACTIVE';
        this.shieldTextEntity.element.color = new Color(0.5, 0.65, 0.8);
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
