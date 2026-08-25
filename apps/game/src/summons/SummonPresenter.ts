import {
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';

export type SummonVisuals = {
  bodyRoot: Entity;
  baseRing: Entity;
  shadowRoot: Entity;
  ringMaterial: StandardMaterial;
};

export class SummonPresenter {
  private materials: StandardMaterial[] = [];

  constructor(private worldLayer?: Layer) {}

  private createMat(options: {
    diffuse: string;
    emissive?: string;
    emissiveIntensity?: number;
    gloss?: number;
    opacity?: number;
    blendType?: number;
  }): StandardMaterial {
    const mat = new StandardMaterial();
    mat.diffuse = colorFromHex(options.diffuse);
    mat.specular = new Color(0, 0, 0);
    if (options.emissive) {
      mat.emissive = colorFromHex(options.emissive);
      mat.emissiveIntensity = options.emissiveIntensity ?? 0.5;
    }
    if (options.gloss !== undefined) mat.gloss = options.gloss;
    if (options.opacity !== undefined) mat.opacity = options.opacity;
    if (options.blendType !== undefined) mat.blendType = options.blendType;
    mat.update();
    this.materials.push(mat);
    return mat;
  }

  private getLayerOption(): { layers?: number[] } {
    return this.worldLayer ? { layers: [this.worldLayer.id] } : {};
  }

  private createCommonBases(parent: Entity, ringColor: string, ringEmissive: string): {
    shadowRoot: Entity;
    baseRing: Entity;
    ringMaterial: StandardMaterial;
    bodyRoot: Entity;
  } {
    const layerOpt = this.getLayerOption();

    // 1. Ground Contact Shadow
    const shadowRoot = new Entity('ContactShadow');
    shadowRoot.setLocalPosition(0, 0.025, 0);
    shadowRoot.setLocalScale(0.72, 0.005, 0.72);
    const shadowMat = this.createMat({
      diffuse: '#000000',
      opacity: 0.45,
      blendType: 1, // BLEND_NORMAL
    });
    shadowRoot.addComponent('render', {
      type: 'cylinder',
      material: shadowMat,
      ...layerOpt,
    });
    parent.addChild(shadowRoot);

    // 2. Base Energy Ring
    const baseRing = new Entity('BaseEnergyRing');
    baseRing.setLocalPosition(0, 0.04, 0);
    baseRing.setLocalScale(0.68, 0.02, 0.68);
    const ringMaterial = this.createMat({
      diffuse: ringColor,
      emissive: ringEmissive,
      emissiveIntensity: 1.2,
      gloss: 0.8,
    });
    baseRing.addComponent('render', {
      type: 'cylinder',
      material: ringMaterial,
      ...layerOpt,
    });
    parent.addChild(baseRing);

    // 3. Body Root
    const bodyRoot = new Entity('BodyRoot');
    bodyRoot.setLocalPosition(0, 0, 0);
    parent.addChild(bodyRoot);

    return { shadowRoot, baseRing, ringMaterial, bodyRoot };
  }

  createVisuals(definitionId: string, parent: Entity): SummonVisuals {
    switch (definitionId) {
      case 'naruto':
        return this.createNarutoVisuals(parent);
      case 'luffy':
        return this.createLuffyVisuals(parent);
      case 'eren':
        return this.createErenVisuals(parent);
      case 'l':
        return this.createLVisuals(parent);
      case 'lelouch':
        return this.createLelouchVisuals(parent);
      case 'goku':
      default:
        return this.createGokuVisuals(parent);
    }
  }

  createGokuVisuals(parent: Entity): SummonVisuals {
    const layerOpt = this.getLayerOption();
    const { shadowRoot, baseRing, ringMaterial, bodyRoot } = this.createCommonBases(
      parent,
      '#fef08a',
      '#f59e0b'
    );

    const giOrange = this.createMat({ diffuse: '#ea580c', emissive: '#c2410c', emissiveIntensity: 0.2, gloss: 0.5 });
    const blueSash = this.createMat({ diffuse: '#1d4ed8', emissive: '#1e40af', emissiveIntensity: 0.25, gloss: 0.6 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.35 });
    const hairGold = this.createMat({ diffuse: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 0.85, gloss: 0.95 });
    const bootTrim = this.createMat({ diffuse: '#dc2626', gloss: 0.5 });

    // 1. Legs & Heavy Combat Boots
    const legs = new Entity('Legs');
    legs.setLocalPosition(0, 0.22, 0);
    legs.setLocalScale(0.32, 0.36, 0.26);
    legs.addComponent('render', { type: 'box', material: giOrange, ...layerOpt });
    bodyRoot.addChild(legs);

    const bootsL = new Entity('BootL');
    bootsL.setLocalPosition(-0.09, 0.08, 0.02);
    bootsL.setLocalScale(0.13, 0.16, 0.19);
    bootsL.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(bootsL);

    const bootsR = new Entity('BootR');
    bootsR.setLocalPosition(0.09, 0.08, 0.02);
    bootsR.setLocalScale(0.13, 0.16, 0.19);
    bootsR.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(bootsR);

    // Red boot lace trims
    const trimL = new Entity('BootTrimL');
    trimL.setLocalPosition(-0.09, 0.08, 0.11);
    trimL.setLocalScale(0.06, 0.12, 0.02);
    trimL.addComponent('render', { type: 'box', material: bootTrim, ...layerOpt });
    bodyRoot.addChild(trimL);

    const trimR = new Entity('BootTrimR');
    trimR.setLocalPosition(0.09, 0.08, 0.11);
    trimR.setLocalScale(0.06, 0.12, 0.02);
    trimR.addComponent('render', { type: 'box', material: bootTrim, ...layerOpt });
    bodyRoot.addChild(trimR);

    // 2. Torso, Blue Undershirt & Sash Belt
    const belt = new Entity('BeltSash');
    belt.setLocalPosition(0, 0.42, 0);
    belt.setLocalScale(0.36, 0.08, 0.28);
    belt.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(belt);

    const torso = new Entity('Torso');
    torso.setLocalPosition(0, 0.60, 0);
    torso.setLocalScale(0.40, 0.32, 0.26);
    torso.addComponent('render', { type: 'box', material: giOrange, ...layerOpt });
    bodyRoot.addChild(torso);

    const undershirt = new Entity('Undershirt');
    undershirt.setLocalPosition(0, 0.64, 0.02);
    undershirt.setLocalScale(0.22, 0.24, 0.24);
    undershirt.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(undershirt);

    // Arms & Wristbands
    const armL = new Entity('ArmL');
    armL.setLocalPosition(-0.25, 0.56, 0);
    armL.setLocalScale(0.12, 0.30, 0.14);
    armL.addComponent('render', { type: 'cylinder', material: skinMat, ...layerOpt });
    bodyRoot.addChild(armL);

    const wristL = new Entity('WristL');
    wristL.setLocalPosition(-0.25, 0.46, 0);
    wristL.setLocalScale(0.14, 0.08, 0.16);
    wristL.addComponent('render', { type: 'cylinder', material: blueSash, ...layerOpt });
    bodyRoot.addChild(wristL);

    const armR = new Entity('ArmR');
    armR.setLocalPosition(0.25, 0.56, 0);
    armR.setLocalScale(0.12, 0.30, 0.14);
    armR.addComponent('render', { type: 'cylinder', material: skinMat, ...layerOpt });
    bodyRoot.addChild(armR);

    const wristR = new Entity('WristR');
    wristR.setLocalPosition(0.25, 0.46, 0);
    wristR.setLocalScale(0.14, 0.08, 0.16);
    wristR.addComponent('render', { type: 'cylinder', material: blueSash, ...layerOpt });
    bodyRoot.addChild(wristR);

    // 3. Head & Multi-Spike Super Saiyan Hair Silhouette
    const head = new Entity('Head');
    head.setLocalPosition(0, 0.86, 0);
    head.setLocalScale(0.24, 0.24, 0.24);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const hairCrown = new Entity('HairCrown');
    hairCrown.setLocalPosition(0, 1.00, -0.02);
    hairCrown.setLocalScale(0.34, 0.22, 0.30);
    hairCrown.addComponent('render', { type: 'box', material: hairGold, ...layerOpt });
    bodyRoot.addChild(hairCrown);

    // Super Saiyan Spikes (Angled Cones)
    const spikeTop = new Entity('SpikeTop');
    spikeTop.setLocalPosition(0, 1.18, -0.04);
    spikeTop.setEulerAngles(-12, 0, 0);
    spikeTop.setLocalScale(0.20, 0.32, 0.20);
    spikeTop.addComponent('render', { type: 'cone', material: hairGold, ...layerOpt });
    bodyRoot.addChild(spikeTop);

    const spikeL = new Entity('SpikeL');
    spikeL.setLocalPosition(-0.14, 1.12, 0);
    spikeL.setEulerAngles(-8, 0, 28);
    spikeL.setLocalScale(0.16, 0.28, 0.16);
    spikeL.addComponent('render', { type: 'cone', material: hairGold, ...layerOpt });
    bodyRoot.addChild(spikeL);

    const spikeR = new Entity('SpikeR');
    spikeR.setLocalPosition(0.14, 1.12, 0);
    spikeR.setEulerAngles(-8, 0, -28);
    spikeR.setLocalScale(0.16, 0.28, 0.16);
    spikeR.addComponent('render', { type: 'cone', material: hairGold, ...layerOpt });
    bodyRoot.addChild(spikeR);

    return { bodyRoot, baseRing, shadowRoot, ringMaterial };
  }

  createNarutoVisuals(parent: Entity): SummonVisuals {
    const layerOpt = this.getLayerOption();
    const { shadowRoot, baseRing, ringMaterial, bodyRoot } = this.createCommonBases(
      parent,
      '#fdba74',
      '#f97316'
    );

    const suitOrange = this.createMat({ diffuse: '#f97316', emissive: '#c2410c', emissiveIntensity: 0.25, gloss: 0.5 });
    const blueAccents = this.createMat({ diffuse: '#1e3a8a', emissive: '#172554', emissiveIntensity: 0.2, gloss: 0.6 });
    const metalPlate = this.createMat({ diffuse: '#cbd5e1', emissive: '#f1f5f9', emissiveIntensity: 0.5, gloss: 0.95 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.35 });
    const hairBlond = this.createMat({ diffuse: '#fde047', emissive: '#eab308', emissiveIntensity: 0.45, gloss: 0.8 });
    const whiteBandage = this.createMat({ diffuse: '#f8fafc', gloss: 0.3 });

    // Legs & Holster Bandage
    const legs = new Entity('Legs');
    legs.setLocalPosition(0, 0.22, 0);
    legs.setLocalScale(0.30, 0.36, 0.24);
    legs.addComponent('render', { type: 'box', material: suitOrange, ...layerOpt });
    bodyRoot.addChild(legs);

    const bandage = new Entity('BandageHolster');
    bandage.setLocalPosition(0.10, 0.24, 0.01);
    bandage.setLocalScale(0.13, 0.12, 0.25);
    bandage.addComponent('render', { type: 'box', material: whiteBandage, ...layerOpt });
    bodyRoot.addChild(bandage);

    // Torso, Shoulder Yoke & High Collar
    const torso = new Entity('Torso');
    torso.setLocalPosition(0, 0.58, 0);
    torso.setLocalScale(0.38, 0.34, 0.26);
    torso.addComponent('render', { type: 'box', material: suitOrange, ...layerOpt });
    bodyRoot.addChild(torso);

    const yoke = new Entity('Yoke');
    yoke.setLocalPosition(0, 0.70, 0);
    yoke.setLocalScale(0.40, 0.12, 0.28);
    yoke.addComponent('render', { type: 'box', material: blueAccents, ...layerOpt });
    bodyRoot.addChild(yoke);

    const collar = new Entity('HighCollar');
    collar.setLocalPosition(0, 0.78, 0);
    collar.setLocalScale(0.30, 0.08, 0.26);
    collar.addComponent('render', { type: 'cylinder', material: whiteBandage, ...layerOpt });
    bodyRoot.addChild(collar);

    // Head, Headband & Spiky Hair
    const head = new Entity('Head');
    head.setLocalPosition(0, 0.88, 0);
    head.setLocalScale(0.24, 0.24, 0.24);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const headband = new Entity('Headband');
    headband.setLocalPosition(0, 0.92, 0.02);
    headband.setLocalScale(0.26, 0.08, 0.26);
    headband.addComponent('render', { type: 'cylinder', material: blueAccents, ...layerOpt });
    bodyRoot.addChild(headband);

    const plate = new Entity('Plate');
    plate.setLocalPosition(0, 0.92, 0.14);
    plate.setLocalScale(0.14, 0.06, 0.02);
    plate.addComponent('render', { type: 'box', material: metalPlate, ...layerOpt });
    bodyRoot.addChild(plate);

    const hairMain = new Entity('HairMain');
    hairMain.setLocalPosition(0, 1.02, 0);
    hairMain.setLocalScale(0.28, 0.18, 0.28);
    hairMain.addComponent('render', { type: 'cone', material: hairBlond, ...layerOpt });
    bodyRoot.addChild(hairMain);

    return { bodyRoot, baseRing, shadowRoot, ringMaterial };
  }

  createLuffyVisuals(parent: Entity): SummonVisuals {
    const layerOpt = this.getLayerOption();
    const { shadowRoot, baseRing, ringMaterial, bodyRoot } = this.createCommonBases(
      parent,
      '#fca5a5',
      '#ef4444'
    );

    const vestRed = this.createMat({ diffuse: '#dc2626', emissive: '#991b1b', emissiveIntensity: 0.25, gloss: 0.5 });
    const shortsBlue = this.createMat({ diffuse: '#2563eb', gloss: 0.45 });
    const strawYellow = this.createMat({ diffuse: '#facc15', emissive: '#ca8a04', emissiveIntensity: 0.35, gloss: 0.7 });
    const hatBandRed = this.createMat({ diffuse: '#b91c1c', gloss: 0.55 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.35 });
    const hairBlack = this.createMat({ diffuse: '#18181b', gloss: 0.6 });

    // Denim Shorts & Legs
    const legs = new Entity('Legs');
    legs.setLocalPosition(0, 0.22, 0);
    legs.setLocalScale(0.28, 0.36, 0.22);
    legs.addComponent('render', { type: 'box', material: shortsBlue, ...layerOpt });
    bodyRoot.addChild(legs);

    // Open Red Vest & Exposed Chest
    const torso = new Entity('Torso');
    torso.setLocalPosition(0, 0.58, 0);
    torso.setLocalScale(0.36, 0.34, 0.24);
    torso.addComponent('render', { type: 'box', material: vestRed, ...layerOpt });
    bodyRoot.addChild(torso);

    const chest = new Entity('ExposedChest');
    chest.setLocalPosition(0, 0.60, 0.08);
    chest.setLocalScale(0.18, 0.28, 0.12);
    chest.addComponent('render', { type: 'box', material: skinMat, ...layerOpt });
    bodyRoot.addChild(chest);

    // Head, Messy Hair & Iconic Straw Hat
    const head = new Entity('Head');
    head.setLocalPosition(0, 0.86, 0);
    head.setLocalScale(0.23, 0.23, 0.23);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const hair = new Entity('Hair');
    hair.setLocalPosition(0, 0.94, -0.02);
    hair.setLocalScale(0.26, 0.14, 0.26);
    hair.addComponent('render', { type: 'sphere', material: hairBlack, ...layerOpt });
    bodyRoot.addChild(hair);

    const brim = new Entity('HatBrim');
    brim.setLocalPosition(0, 0.98, 0);
    brim.setLocalScale(0.52, 0.03, 0.52);
    brim.addComponent('render', { type: 'cylinder', material: strawYellow, ...layerOpt });
    bodyRoot.addChild(brim);

    const dome = new Entity('HatDome');
    dome.setLocalPosition(0, 1.05, 0);
    dome.setLocalScale(0.28, 0.12, 0.28);
    dome.addComponent('render', { type: 'cylinder', material: strawYellow, ...layerOpt });
    bodyRoot.addChild(dome);

    const hatBand = new Entity('HatBand');
    hatBand.setLocalPosition(0, 1.01, 0);
    hatBand.setLocalScale(0.30, 0.03, 0.30);
    hatBand.addComponent('render', { type: 'cylinder', material: hatBandRed, ...layerOpt });
    bodyRoot.addChild(hatBand);

    return { bodyRoot, baseRing, shadowRoot, ringMaterial };
  }

  createErenVisuals(parent: Entity): SummonVisuals {
    const layerOpt = this.getLayerOption();
    const { shadowRoot, baseRing, ringMaterial, bodyRoot } = this.createCommonBases(
      parent,
      '#86efac',
      '#22c55e'
    );

    const capeGreen = this.createMat({ diffuse: '#15803d', emissive: '#166534', emissiveIntensity: 0.35, gloss: 0.5 });
    const jacketBrown = this.createMat({ diffuse: '#78350f', gloss: 0.45 });
    const pantsWhite = this.createMat({ diffuse: '#f8fafc', gloss: 0.35 });
    const bootsBrown = this.createMat({ diffuse: '#451a03', gloss: 0.6 });
    const hairBrown = this.createMat({ diffuse: '#3f1d0b', gloss: 0.55 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.35 });

    // White Trousers & High Boots
    const legs = new Entity('Legs');
    legs.setLocalPosition(0, 0.22, 0);
    legs.setLocalScale(0.30, 0.36, 0.24);
    legs.addComponent('render', { type: 'box', material: pantsWhite, ...layerOpt });
    bodyRoot.addChild(legs);

    const bootL = new Entity('BootL');
    bootL.setLocalPosition(-0.08, 0.12, 0);
    bootL.setLocalScale(0.12, 0.24, 0.22);
    bootL.addComponent('render', { type: 'box', material: bootsBrown, ...layerOpt });
    bodyRoot.addChild(bootL);

    const bootR = new Entity('BootR');
    bootR.setLocalPosition(0.08, 0.12, 0);
    bootR.setLocalScale(0.12, 0.24, 0.22);
    bootR.addComponent('render', { type: 'box', material: bootsBrown, ...layerOpt });
    bodyRoot.addChild(bootR);

    // Scout Jacket & Flowing Green Cape
    const torso = new Entity('Torso');
    torso.setLocalPosition(0, 0.60, 0);
    torso.setLocalScale(0.36, 0.34, 0.24);
    torso.addComponent('render', { type: 'box', material: jacketBrown, ...layerOpt });
    bodyRoot.addChild(torso);

    const cape = new Entity('Cape');
    cape.setLocalPosition(0, 0.56, -0.14);
    cape.setEulerAngles(14, 0, 0);
    cape.setLocalScale(0.44, 0.50, 0.08);
    cape.addComponent('render', { type: 'box', material: capeGreen, ...layerOpt });
    bodyRoot.addChild(cape);

    // Head & Hair
    const head = new Entity('Head');
    head.setLocalPosition(0, 0.88, 0);
    head.setLocalScale(0.24, 0.24, 0.24);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const hair = new Entity('Hair');
    hair.setLocalPosition(0, 0.98, -0.02);
    hair.setLocalScale(0.28, 0.16, 0.26);
    hair.addComponent('render', { type: 'sphere', material: hairBrown, ...layerOpt });
    bodyRoot.addChild(hair);

    return { bodyRoot, baseRing, shadowRoot, ringMaterial };
  }

  createLVisuals(parent: Entity): SummonVisuals {
    const layerOpt = this.getLayerOption();
    const { shadowRoot, baseRing, ringMaterial, bodyRoot } = this.createCommonBases(
      parent,
      '#7dd3fc',
      '#0284c7'
    );

    const shirtWhite = this.createMat({ diffuse: '#f8fafc', emissive: '#e2e8f0', emissiveIntensity: 0.2, gloss: 0.35 });
    const jeansBlue = this.createMat({ diffuse: '#334155', gloss: 0.45 });
    const hairBlack = this.createMat({ diffuse: '#09090b', gloss: 0.85 });
    const skinMat = this.createMat({ diffuse: '#ffedd5', gloss: 0.25 });

    // Baggy Jeans
    const legs = new Entity('Legs');
    legs.setLocalPosition(0, 0.20, 0);
    legs.setLocalScale(0.30, 0.36, 0.26);
    legs.addComponent('render', { type: 'box', material: jeansBlue, ...layerOpt });
    bodyRoot.addChild(legs);

    // Slouched White Shirt
    const torso = new Entity('Torso');
    torso.setLocalPosition(0, 0.56, 0.04);
    torso.setEulerAngles(10, 0, 0);
    torso.setLocalScale(0.40, 0.38, 0.30);
    torso.addComponent('render', { type: 'box', material: shirtWhite, ...layerOpt });
    bodyRoot.addChild(torso);

    // Pale Head & Wild Shaggy Hair
    const head = new Entity('Head');
    head.setLocalPosition(0, 0.84, 0.08);
    head.setLocalScale(0.23, 0.23, 0.23);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const hair = new Entity('Hair');
    hair.setLocalPosition(0, 0.94, 0.06);
    hair.setLocalScale(0.32, 0.20, 0.30);
    hair.addComponent('render', { type: 'sphere', material: hairBlack, ...layerOpt });
    bodyRoot.addChild(hair);

    return { bodyRoot, baseRing, shadowRoot, ringMaterial };
  }

  createLelouchVisuals(parent: Entity): SummonVisuals {
    const layerOpt = this.getLayerOption();
    const { shadowRoot, baseRing, ringMaterial, bodyRoot } = this.createCommonBases(
      parent,
      '#c084fc',
      '#7c3aed'
    );

    const cloakBlack = this.createMat({ diffuse: '#0f172a', emissive: '#3b0764', emissiveIntensity: 0.35, gloss: 0.75 });
    const purpleTrim = this.createMat({ diffuse: '#581c87', emissive: '#a855f7', emissiveIntensity: 0.6, gloss: 0.85 });
    const goldTrim = this.createMat({ diffuse: '#eab308', emissive: '#ca8a04', emissiveIntensity: 0.7, gloss: 0.95 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.35 });
    const hairDark = this.createMat({ diffuse: '#1e1b4b', gloss: 0.75 });

    // Slim Imperial Trousers
    const legs = new Entity('Legs');
    legs.setLocalPosition(0, 0.22, 0);
    legs.setLocalScale(0.28, 0.38, 0.24);
    legs.addComponent('render', { type: 'box', material: cloakBlack, ...layerOpt });
    bodyRoot.addChild(legs);

    // Black Royal Tunic with Gold Trim
    const torso = new Entity('Torso');
    torso.setLocalPosition(0, 0.60, 0);
    torso.setLocalScale(0.36, 0.34, 0.26);
    torso.addComponent('render', { type: 'box', material: cloakBlack, ...layerOpt });
    bodyRoot.addChild(torso);

    const goldAccent = new Entity('GoldTrim');
    goldAccent.setLocalPosition(0, 0.62, 0.14);
    goldAccent.setLocalScale(0.14, 0.28, 0.02);
    goldAccent.addComponent('render', { type: 'box', material: goldTrim, ...layerOpt });
    bodyRoot.addChild(goldAccent);

    // High Flared Zero Collar (Purple Velvet & Gold Rim)
    const collar = new Entity('HighCollar');
    collar.setLocalPosition(0, 0.82, -0.06);
    collar.setEulerAngles(-18, 0, 0);
    collar.setLocalScale(0.44, 0.28, 0.08);
    collar.addComponent('render', { type: 'box', material: purpleTrim, ...layerOpt });
    bodyRoot.addChild(collar);

    // Head & Dark Hair
    const head = new Entity('Head');
    head.setLocalPosition(0, 0.88, 0);
    head.setLocalScale(0.23, 0.23, 0.23);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const hair = new Entity('Hair');
    hair.setLocalPosition(0, 0.98, -0.02);
    hair.setLocalScale(0.28, 0.16, 0.26);
    hair.addComponent('render', { type: 'sphere', material: hairDark, ...layerOpt });
    bodyRoot.addChild(hair);

    return { bodyRoot, baseRing, shadowRoot, ringMaterial };
  }

  destroy(): void {
    for (const mat of this.materials) {
      mat.destroy();
    }
    this.materials.length = 0;
  }
}
