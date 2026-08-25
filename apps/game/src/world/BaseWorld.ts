import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';
import { CAMP_CELL_SIZE } from './CampCoordinateMapper';
import { CAMP_SIZE } from '@psyblr/game-rules';

type FloatingObject = {
  entity: Entity;
  baseY: number;
  bobSpeed: number;
  bobAmp: number;
  rotSpeedY: number;
  phase: number;
};

export class BaseWorld {
  public root: Entity;
  public dealerRoot: Entity | null = null;
  public spawnMachineRoot: Entity | null = null;
  public defensePodiumRoot: Entity | null = null;
  public campaignGateRoot: Entity | null = null;
  public raidGateRoot: Entity | null = null;
  public dealerBubbleRoot: Entity | null = null;

  private materials: StandardMaterial[] = [];
  private floatingObjects: FloatingObject[] = [];
  private time: number = 0;

  constructor(private app: Application, private worldLayer?: Layer) {
    this.root = new Entity('BaseWorld_Root');
    this.app.root.addChild(this.root);

    this.buildLighting();
    this.buildTerrain();
    this.buildCampPlatform();
    this.buildInteractiveStructures();
    this.buildAmbientMonoliths();
  }

  private createMaterial(options: {
    diffuse?: Color | string;
    emissive?: Color | string;
    emissiveIntensity?: number;
    gloss?: number;
    metalness?: number;
    opacity?: number;
    blendType?: number;
  }): StandardMaterial {
    const mat = new StandardMaterial();
    mat.specular = new Color(0, 0, 0);
    if (options.diffuse) {
      mat.diffuse = typeof options.diffuse === 'string' ? colorFromHex(options.diffuse) : options.diffuse;
    }
    if (options.emissive) {
      mat.emissive = typeof options.emissive === 'string' ? colorFromHex(options.emissive) : options.emissive;
      mat.emissiveIntensity = options.emissiveIntensity ?? 0.5;
    }
    if (options.gloss !== undefined) mat.gloss = options.gloss;
    if (options.metalness !== undefined) mat.metalness = options.metalness;
    if (options.opacity !== undefined) mat.opacity = options.opacity;
    if (options.blendType !== undefined) mat.blendType = options.blendType;
    mat.update();
    this.materials.push(mat);
    return mat;
  }

  private getLayerOption(): { layers?: number[] } {
    return this.worldLayer ? { layers: [this.worldLayer.id] } : {};
  }

  private buildLighting(): void {
    const layerOpt = this.getLayerOption();

    const keyLight = new Entity('KeyLight');
    keyLight.setEulerAngles(55, 30, 0);
    keyLight.addComponent('light', {
      type: 'directional',
      color: new Color(1.0, 0.96, 0.90),
      intensity: 1.3,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(keyLight);

    const fillLight = new Entity('FillLight');
    fillLight.setEulerAngles(45, -140, 0);
    fillLight.addComponent('light', {
      type: 'directional',
      color: new Color(0.35, 0.55, 0.90),
      intensity: 0.8,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(fillLight);

    const bounceLight = new Entity('BounceLight');
    bounceLight.setEulerAngles(70, -60, 0);
    bounceLight.addComponent('light', {
      type: 'directional',
      color: new Color(0.40, 0.35, 0.60),
      intensity: 0.45,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(bounceLight);
  }

  private buildTerrain(): void {
    const layerOpt = this.getLayerOption();

    // 1. Abyss Base (Deep Navy Void)
    const abyssMat = this.createMaterial({ diffuse: '#050811', gloss: 0 });
    const outerPlinth = new Entity('OuterPlinth');
    outerPlinth.setLocalPosition(0, -0.6, 0);
    outerPlinth.setLocalScale(30, 0.6, 26);
    outerPlinth.addComponent('render', {
      type: 'box',
      material: abyssMat,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(outerPlinth);

    // 2. Island Diorama Slab (top at y = 0.0)
    const islandMat = this.createMaterial({ diffuse: '#0c1322', gloss: 0 });
    const islandBase = new Entity('IslandBase');
    islandBase.setLocalPosition(0, -0.15, 0);
    islandBase.setLocalScale(21, 0.3, 18);
    islandBase.addComponent('render', {
      type: 'box',
      material: islandMat,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(islandBase);

    // 3. Island Rim Glow (y = 0.01)
    const rimMat = this.createMaterial({
      diffuse: '#1e293b',
      emissive: '#0284c7',
      emissiveIntensity: 0.4,
      gloss: 0,
    });
    const rimEntity = new Entity('IslandRim');
    rimEntity.setLocalPosition(0, 0.01, 0);
    rimEntity.setLocalScale(21.2, 0.02, 18.2);
    rimEntity.addComponent('render', {
      type: 'box',
      material: rimMat,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(rimEntity);
  }

  private buildCampPlatform(): void {
    const layerOpt = this.getLayerOption();
    const campWidth = CAMP_SIZE * CAMP_CELL_SIZE; // 7.5
    const campDepth = CAMP_SIZE * CAMP_CELL_SIZE; // 7.5

    // 1. Raised Camp Arena Slab (top at y = 0.04)
    const campSlabMat = this.createMaterial({ diffuse: '#101726', emissive: '#0c1527', emissiveIntensity: 0.2, gloss: 0 });
    const campSlab = new Entity('CampSlab');
    campSlab.setLocalPosition(0, 0.02, 0);
    campSlab.setLocalScale(campWidth + 0.3, 0.04, campDepth + 0.3);
    campSlab.addComponent('render', {
      type: 'box',
      material: campSlabMat,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(campSlab);

    // 2. Arena Gold Border Trim (y = 0.045)
    const borderMat = this.createMaterial({
      diffuse: '#78350f',
      emissive: '#f59e0b',
      emissiveIntensity: 0.5,
      gloss: 0,
    });
    const arenaBorder = new Entity('ArenaBorder');
    arenaBorder.setLocalPosition(0, 0.045, 0);
    arenaBorder.setLocalScale(campWidth + 0.36, 0.01, campDepth + 0.36);
    arenaBorder.addComponent('render', {
      type: 'box',
      material: borderMat,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(arenaBorder);

    // 3. Illuminati Row (Row 0, y=0) Protected Raised Dais (top at y = 0.08)
    const illuminatiMat = this.createMaterial({
      diffuse: '#0a1d37',
      emissive: '#0284c7',
      emissiveIntensity: 0.55,
      gloss: 0,
    });
    const illuminatiRow = new Entity('IlluminatiRowPlinth');
    illuminatiRow.setLocalPosition(0, 0.06, (0 - 2.5) * CAMP_CELL_SIZE);
    illuminatiRow.setLocalScale(campWidth - 0.08, 0.04, CAMP_CELL_SIZE - 0.08);
    illuminatiRow.addComponent('render', {
      type: 'box',
      material: illuminatiMat,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(illuminatiRow);

    // Illuminati Gold Rim Accent (y = 0.085)
    const illumGoldMat = this.createMaterial({
      diffuse: '#b45309',
      emissive: '#fbbf24',
      emissiveIntensity: 0.8,
      gloss: 0,
    });
    const illumGoldRim = new Entity('IlluminatiGoldRim');
    illumGoldRim.setLocalPosition(0, 0.085, (0 - 2.5) * CAMP_CELL_SIZE);
    illumGoldRim.setLocalScale(campWidth - 0.04, 0.01, CAMP_CELL_SIZE - 0.04);
    illumGoldRim.addComponent('render', {
      type: 'box',
      material: illumGoldMat,
      castShadows: false,
      ...layerOpt,
    });
    this.root.addChild(illumGoldRim);

    // 4. Cell Grid Corner Dots (y = 0.05 on normal, y = 0.09 on Row 0)
    const dotMat = this.createMaterial({
      diffuse: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.5,
      gloss: 0.8,
    });

    const gridContainer = new Entity('CampGridDots');
    this.root.addChild(gridContainer);

    for (let x = 0; x <= CAMP_SIZE; x++) {
      for (let y = 0; y <= CAMP_SIZE; y++) {
        const wx = (x - CAMP_SIZE / 2) * CAMP_CELL_SIZE;
        const wz = (y - CAMP_SIZE / 2) * CAMP_CELL_SIZE;
        const dotY = y === 0 || y === 1 ? 0.095 : 0.055;

        const dot = new Entity(`GridDot_${x}_${y}`);
        dot.setLocalPosition(wx, dotY, wz);
        dot.setLocalScale(0.04, 0.01, 0.04);
        dot.addComponent('render', {
          type: 'box',
          material: dotMat,
          castShadows: false,
          ...layerOpt,
        });
        gridContainer.addChild(dot);
      }
    }
  }

  private buildInteractiveStructures(): void {
    const layerOpt = this.getLayerOption();

    // 1. DEALER CHARACTER BOOTH (Front-Right at [4.8, 0, 4.8])
    this.dealerRoot = new Entity('Dealer_Root');
    this.dealerRoot.setLocalPosition(4.8, 0, 4.8);
    this.dealerRoot.setEulerAngles(0, -35, 0);
    this.root.addChild(this.dealerRoot);

    const dealerPadMat = this.createMaterial({ diffuse: '#064e3b', emissive: '#10b981', emissiveIntensity: 0.4, gloss: 0.8 });
    const dealerPad = new Entity('DealerPad');
    dealerPad.setLocalPosition(0, 0.03, 0);
    dealerPad.setLocalScale(2.4, 0.06, 2.4);
    dealerPad.addComponent('render', { type: 'box', material: dealerPadMat, castShadows: false, ...layerOpt });
    this.dealerRoot.addChild(dealerPad);

    const woodMat = this.createMaterial({ diffuse: '#78350f', emissive: '#b45309', emissiveIntensity: 0.2, gloss: 0.5 });
    const desk = new Entity('DealerDesk');
    desk.setLocalPosition(0, 0.45, 0);
    desk.setLocalScale(1.6, 0.8, 0.7);
    desk.addComponent('render', { type: 'box', material: woodMat, castShadows: false, ...layerOpt });
    this.dealerRoot.addChild(desk);

    const clothMat = this.createMaterial({ diffuse: '#047857', emissive: '#059669', emissiveIntensity: 0.4, gloss: 0.6 });
    const skinMat = this.createMaterial({ diffuse: '#fed7aa', gloss: 0.35 });
    const hatMat = this.createMaterial({ diffuse: '#064e3b', emissive: '#10b981', emissiveIntensity: 0.3, gloss: 0.7 });

    const npcTorso = new Entity('DealerTorso');
    npcTorso.setLocalPosition(0, 1.0, -0.3);
    npcTorso.setLocalScale(0.45, 0.55, 0.3);
    npcTorso.addComponent('render', { type: 'box', material: clothMat, ...layerOpt });
    this.dealerRoot.addChild(npcTorso);

    const npcHead = new Entity('DealerHead');
    npcHead.setLocalPosition(0, 1.4, -0.3);
    npcHead.setLocalScale(0.28, 0.28, 0.28);
    npcHead.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    this.dealerRoot.addChild(npcHead);

    const npcHat = new Entity('DealerHat');
    npcHat.setLocalPosition(0, 1.55, -0.3);
    npcHat.setLocalScale(0.48, 0.1, 0.48);
    npcHat.addComponent('render', { type: 'cylinder', material: hatMat, ...layerOpt });
    this.dealerRoot.addChild(npcHat);

    // Floating Glowing 100-Ball Beacon Orb
    const ballOrbMat = this.createMaterial({ diffuse: '#059669', emissive: '#34d399', emissiveIntensity: 1.2, gloss: 0.95 });
    const dealerBeacon = new Entity('DealerBeaconOrb');
    dealerBeacon.setLocalPosition(0, 2.3, 0);
    dealerBeacon.setLocalScale(0.45, 0.45, 0.45);
    dealerBeacon.addComponent('render', { type: 'sphere', material: ballOrbMat, ...layerOpt });
    this.dealerRoot.addChild(dealerBeacon);

    // Floating Clash-of-Clans style Harvest / Collect Bubble above Dealer
    const bubbleMat = this.createMaterial({ diffuse: '#047857', emissive: '#10b981', emissiveIntensity: 1.5, gloss: 0.98 });
    const bubbleIconMat = this.createMaterial({ diffuse: '#f59e0b', emissive: '#fbbf24', emissiveIntensity: 1.8, gloss: 0.98 });
    
    this.dealerBubbleRoot = new Entity('DealerHarvestBubble');
    this.dealerBubbleRoot.setLocalPosition(0, 3.1, 0);
    this.dealerRoot.addChild(this.dealerBubbleRoot);

    const bubbleOuter = new Entity('BubbleOuter');
    bubbleOuter.setLocalPosition(0, 0, 0);
    bubbleOuter.setLocalScale(0.85, 0.85, 0.85);
    bubbleOuter.addComponent('render', { type: 'sphere', material: bubbleMat, castShadows: false, ...layerOpt });
    this.dealerBubbleRoot.addChild(bubbleOuter);

    const bubbleCoin = new Entity('BubbleCoin');
    bubbleCoin.setLocalPosition(0, 0, 0.08);
    bubbleCoin.setLocalScale(0.45, 0.45, 0.12);
    bubbleCoin.addComponent('render', { type: 'cylinder', material: bubbleIconMat, castShadows: false, ...layerOpt });
    bubbleCoin.setEulerAngles(90, 0, 0);
    this.dealerBubbleRoot.addChild(bubbleCoin);

    this.floatingObjects.push({
      entity: dealerBeacon,
      baseY: 2.3,
      bobSpeed: 2.2,
      bobAmp: 0.14,
      rotSpeedY: 50,
      phase: 0.4,
    });

    this.floatingObjects.push({
      entity: this.dealerBubbleRoot,
      baseY: 3.1,
      bobSpeed: 3.0,
      bobAmp: 0.18,
      rotSpeedY: 35,
      phase: 0.0,
    });

    // 2. SPAWN MACHINE (Plinko Gacha Cabinet at [6.4, 0, 0])
    this.spawnMachineRoot = new Entity('SpawnMachine_Root');
    this.spawnMachineRoot.setLocalPosition(6.4, 0, 0);
    this.spawnMachineRoot.setEulerAngles(0, -18, 0);
    this.root.addChild(this.spawnMachineRoot);

    const spawnPadMat = this.createMaterial({ diffuse: '#131e33', emissive: '#f59e0b', emissiveIntensity: 0.4, gloss: 0.75 });
    const spawnPedestal = new Entity('SpawnPedestal');
    spawnPedestal.setLocalPosition(0, 0.03, 0);
    spawnPedestal.setLocalScale(2.8, 0.06, 2.8);
    spawnPedestal.addComponent('render', { type: 'box', material: spawnPadMat, castShadows: false, ...layerOpt });
    this.spawnMachineRoot.addChild(spawnPedestal);

    // 3. DEFENSE PODIUM (Front-Left at [-4.8, 0, 4.8])
    this.defensePodiumRoot = new Entity('DefensePodium_Root');
    this.defensePodiumRoot.setLocalPosition(-4.8, 0, 4.8);
    this.defensePodiumRoot.setEulerAngles(0, 35, 0);
    this.root.addChild(this.defensePodiumRoot);

    const defPadMat = this.createMaterial({ diffuse: '#1e1b4b', emissive: '#6366f1', emissiveIntensity: 0.4, gloss: 0.8 });
    const defPedestal = new Entity('DefPedestal');
    defPedestal.setLocalPosition(0, 0.03, 0);
    defPedestal.setLocalScale(2.4, 0.06, 2.4);
    defPedestal.addComponent('render', { type: 'box', material: defPadMat, castShadows: false, ...layerOpt });
    this.defensePodiumRoot.addChild(defPedestal);

    const stoneMat = this.createMaterial({ diffuse: '#312e81', emissive: '#818cf8', emissiveIntensity: 0.4, gloss: 0.7 });
    const positions = [[-0.6, 0.3, 0], [0, 0.45, -0.2], [0.6, 0.6, 0]];
    const heights = [0.55, 0.85, 1.15];
    const scales = [0.45, 0.45, 0.45];

    positions.forEach((pos, idx) => {
      const pEnt = new Entity(`Podium_${idx}`);
      const h = heights[idx] ?? 0.7;
      const s = scales[idx] ?? 0.45;
      pEnt.setLocalPosition(pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0);
      pEnt.setLocalScale(s, h, s);
      pEnt.addComponent('render', { type: 'cylinder', material: stoneMat, ...layerOpt });
      this.defensePodiumRoot!.addChild(pEnt);
    });

    // Floating Defense Shield Crystal
    const defShieldMat = this.createMaterial({ diffuse: '#4f46e5', emissive: '#a5b4fc', emissiveIntensity: 1.1, gloss: 0.95 });
    const defBeacon = new Entity('DefBeacon');
    defBeacon.setLocalPosition(0, 2.1, 0);
    defBeacon.setLocalScale(0.38, 0.6, 0.38);
    defBeacon.addComponent('render', { type: 'box', material: defShieldMat, ...layerOpt });
    this.defensePodiumRoot.addChild(defBeacon);

    this.floatingObjects.push({
      entity: defBeacon,
      baseY: 2.1,
      bobSpeed: 2.0,
      bobAmp: 0.12,
      rotSpeedY: 45,
      phase: 1.2,
    });

    // 4. CAMPAIGN GATE (North Astral Portal at [0, 0, -6.4])
    this.campaignGateRoot = new Entity('CampaignGate_Root');
    this.campaignGateRoot.setLocalPosition(0, 0, -6.4);
    this.campaignGateRoot.setEulerAngles(0, 0, 0);
    this.root.addChild(this.campaignGateRoot);

    const campPadMat = this.createMaterial({ diffuse: '#082f49', emissive: '#0284c7', emissiveIntensity: 0.4, gloss: 0.8 });
    const campPad = new Entity('CampGatePad');
    campPad.setLocalPosition(0, 0.03, 0);
    campPad.setLocalScale(2.8, 0.06, 2.4);
    campPad.addComponent('render', { type: 'box', material: campPadMat, castShadows: false, ...layerOpt });
    this.campaignGateRoot.addChild(campPad);

    const campArchMat = this.createMaterial({ diffuse: '#0369a1', emissive: '#38bdf8', emissiveIntensity: 0.5, gloss: 0.7 });
    const campPillarL = new Entity('CampPillarL');
    campPillarL.setLocalPosition(-0.85, 0.95, 0);
    campPillarL.setLocalScale(0.28, 1.9, 0.28);
    campPillarL.addComponent('render', { type: 'box', material: campArchMat, ...layerOpt });
    this.campaignGateRoot.addChild(campPillarL);

    const campPillarR = new Entity('CampPillarR');
    campPillarR.setLocalPosition(0.85, 0.95, 0);
    campPillarR.setLocalScale(0.28, 1.9, 0.28);
    campPillarR.addComponent('render', { type: 'box', material: campArchMat, ...layerOpt });
    this.campaignGateRoot.addChild(campPillarR);

    const campArchTop = new Entity('CampArchTop');
    campArchTop.setLocalPosition(0, 1.95, 0);
    campArchTop.setLocalScale(2.0, 0.25, 0.32);
    campArchTop.addComponent('render', { type: 'box', material: campArchMat, ...layerOpt });
    this.campaignGateRoot.addChild(campArchTop);

    // Celestial Blue Portal Crystal
    const campCrystalMat = this.createMaterial({ diffuse: '#0284c7', emissive: '#7dd3fc', emissiveIntensity: 1.2, gloss: 0.95 });
    const campCrystal = new Entity('CampPortalCrystal');
    campCrystal.setLocalPosition(0, 1.05, 0);
    campCrystal.setLocalScale(0.4, 0.7, 0.2);
    campCrystal.addComponent('render', { type: 'box', material: campCrystalMat, ...layerOpt });
    this.campaignGateRoot.addChild(campCrystal);

    this.floatingObjects.push({
      entity: campCrystal,
      baseY: 1.05,
      bobSpeed: 2.6,
      bobAmp: 0.1,
      rotSpeedY: 60,
      phase: 0.8,
    });

    // 5. RAID GATE (West Crimson Portal Arch at [-6.4, 0, 0])
    this.raidGateRoot = new Entity('RaidGate_Root');
    this.raidGateRoot.setLocalPosition(-6.4, 0, 0);
    this.raidGateRoot.setEulerAngles(0, 18, 0);
    this.root.addChild(this.raidGateRoot);

    const raidPadMat = this.createMaterial({ diffuse: '#131e33', emissive: '#ef4444', emissiveIntensity: 0.35, gloss: 0 });
    const raidPedestal = new Entity('RaidPedestal');
    raidPedestal.setLocalPosition(0, 0.03, 0);
    raidPedestal.setLocalScale(2.8, 0.06, 2.8);
    raidPedestal.addComponent('render', { type: 'box', material: raidPadMat, castShadows: false, ...layerOpt });
    this.raidGateRoot.addChild(raidPedestal);

    const raidGateMat = this.createMaterial({ diffuse: '#1e293b', emissive: '#dc2626', emissiveIntensity: 0.35, gloss: 0 });
    const pillarL = new Entity('RaidPillarL');
    pillarL.setLocalPosition(-0.7, 0.85, 0);
    pillarL.setLocalScale(0.24, 1.7, 0.24);
    pillarL.addComponent('render', { type: 'box', material: raidGateMat, ...layerOpt });
    this.raidGateRoot.addChild(pillarL);

    const pillarR = new Entity('RaidPillarR');
    pillarR.setLocalPosition(0.7, 0.85, 0);
    pillarR.setLocalScale(0.24, 1.7, 0.24);
    pillarR.addComponent('render', { type: 'box', material: raidGateMat, ...layerOpt });
    this.raidGateRoot.addChild(pillarR);

    const archTop = new Entity('RaidArchTop');
    archTop.setLocalPosition(0, 1.75, 0);
    archTop.setLocalScale(1.7, 0.22, 0.28);
    archTop.addComponent('render', { type: 'box', material: raidGateMat, ...layerOpt });
    this.raidGateRoot.addChild(archTop);

    // Crimson Rune Crystal
    const raidCrystalMat = this.createMaterial({ diffuse: '#7f1d1d', emissive: '#ef4444', emissiveIntensity: 0.95, gloss: 0.95 });
    const raidCrystal = new Entity('RaidPortalCrystal');
    raidCrystal.setLocalPosition(0, 0.95, 0);
    raidCrystal.setLocalScale(0.35, 0.6, 0.15);
    raidCrystal.addComponent('render', { type: 'box', material: raidCrystalMat, ...layerOpt });
    this.raidGateRoot.addChild(raidCrystal);

    this.floatingObjects.push({
      entity: raidCrystal,
      baseY: 0.95,
      bobSpeed: 2.4,
      bobAmp: 0.08,
      rotSpeedY: 45,
      phase: Math.PI / 2,
    });
  }

  private buildAmbientMonoliths(): void {
    const layerOpt = this.getLayerOption();

    const crystalMat = this.createMaterial({
      diffuse: '#0c4a6e',
      emissive: '#38bdf8',
      emissiveIntensity: 0.6,
      gloss: 0.9,
    });

    const positions: [number, number, number][] = [
      [-11.5, 0.8, -8.5],
      [11.5, 1.1, -8.0],
      [-12.0, 0.6, 8.0],
      [11.8, 0.9, 8.5],
    ];

    positions.forEach((pos, i) => {
      const monolith = new Entity(`AmbientMonolith_${i}`);
      monolith.setLocalPosition(pos[0], pos[1], pos[2]);
      monolith.setLocalScale(0.35, 1.1, 0.35);
      monolith.addComponent('render', {
        type: 'box',
        material: crystalMat,
        castShadows: false,
        ...layerOpt,
      });
      this.root.addChild(monolith);

      this.floatingObjects.push({
        entity: monolith,
        baseY: pos[1],
        bobSpeed: 1.2 + i * 0.3,
        bobAmp: 0.12,
        rotSpeedY: 15 + i * 8,
        phase: i * 1.5,
      });
    });
  }

  update(dt: number): void {
    this.time += dt;

    for (const obj of this.floatingObjects) {
      const bob = Math.sin(this.time * obj.bobSpeed + obj.phase) * obj.bobAmp;
      const curPos = obj.entity.getLocalPosition();
      obj.entity.setLocalPosition(curPos.x, obj.baseY + bob, curPos.z);
      obj.entity.rotateLocal(0, obj.rotSpeedY * dt, 0);
    }
  }

  setDealerBubbleVisible(visible: boolean): void {
    if (this.dealerBubbleRoot) {
      this.dealerBubbleRoot.enabled = visible;
    }
  }

  setVisible(visible: boolean): void {
    this.root.enabled = visible;
  }

  destroy(): void {
    this.root.destroy();
    for (const mat of this.materials) {
      mat.destroy();
    }
    this.materials.length = 0;
    this.floatingObjects.length = 0;
  }
}
