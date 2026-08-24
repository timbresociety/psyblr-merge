import {
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';

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
    mat.diffuse = new Color().fromString(options.diffuse);
    if (options.emissive) {
      mat.emissive = new Color().fromString(options.emissive);
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
    shadowRoot.setPosition(0, 0.025, 0);
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
    baseRing.setPosition(0, 0.04, 0);
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
    bodyRoot.setPosition(0, 0, 0);
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

    const giOrange = this.createMat({ diffuse: '#ea580c', emissive: '#c2410c', emissiveIntensity: 0.15, gloss: 0.4 });
    const blueSash = this.createMat({ diffuse: '#1d4ed8', emissive: '#1e40af', emissiveIntensity: 0.2, gloss: 0.5 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.3 });
    const hairGold = this.createMat({ diffuse: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 0.8, gloss: 0.9 });
    const eyeMat = this.createMat({ diffuse: '#0f172a', gloss: 0.9 });

    // Legs & Boots
    const legs = new Entity('Legs');
    legs.setPosition(0, 0.24, 0);
    legs.setLocalScale(0.32, 0.38, 0.26);
    legs.addComponent('render', { type: 'box', material: giOrange, ...layerOpt });
    bodyRoot.addChild(legs);

    const bootsL = new Entity('BootL');
    bootsL.setPosition(-0.1, 0.08, 0.02);
    bootsL.setLocalScale(0.12, 0.16, 0.18);
    bootsL.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(bootsL);

    const bootsR = new Entity('BootR');
    bootsR.setPosition(0.1, 0.08, 0.02);
    bootsR.setLocalScale(0.12, 0.16, 0.18);
    bootsR.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(bootsR);

    // Torso, Sash & Arms
    const belt = new Entity('BeltSash');
    belt.setPosition(0, 0.44, 0);
    belt.setLocalScale(0.35, 0.08, 0.28);
    belt.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(belt);

    const torso = new Entity('Torso');
    torso.setPosition(0, 0.62, 0);
    torso.setLocalScale(0.38, 0.32, 0.26);
    torso.addComponent('render', { type: 'box', material: giOrange, ...layerOpt });
    bodyRoot.addChild(torso);

    const armL = new Entity('ArmL');
    armL.setPosition(-0.25, 0.58, 0);
    armL.setLocalScale(0.12, 0.32, 0.14);
    armL.addComponent('render', { type: 'cylinder', material: skinMat, ...layerOpt });
    bodyRoot.addChild(armL);

    const armR = new Entity('ArmR');
    armR.setPosition(0.25, 0.58, 0);
    armR.setLocalScale(0.12, 0.32, 0.14);
    armR.addComponent('render', { type: 'cylinder', material: skinMat, ...layerOpt });
    bodyRoot.addChild(armR);

    // Head & Hair Spikes
    const head = new Entity('Head');
    head.setPosition(0, 0.88, 0);
    head.setLocalScale(0.24, 0.24, 0.24);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const hairMain = new Entity('HairMain');
    hairMain.setPosition(0, 1.04, -0.02);
    hairMain.setLocalScale(0.32, 0.22, 0.28);
    hairMain.addComponent('render', { type: 'box', material: hairGold, ...layerOpt });
    bodyRoot.addChild(hairMain);

    const spikeTop = new Entity('SpikeTop');
    spikeTop.setPosition(0, 1.18, -0.04);
    spikeTop.setEulerAngles(-15, 0, 0);
    spikeTop.setLocalScale(0.18, 0.28, 0.18);
    spikeTop.addComponent('render', { type: 'cone', material: hairGold, ...layerOpt });
    bodyRoot.addChild(spikeTop);

    const eyeBand = new Entity('EyeBand');
    eyeBand.setPosition(0, 0.88, 0.12);
    eyeBand.setLocalScale(0.16, 0.04, 0.03);
    eyeBand.addComponent('render', { type: 'box', material: eyeMat, ...layerOpt });
    bodyRoot.addChild(eyeBand);

    return { bodyRoot, baseRing, shadowRoot, ringMaterial };
  }

  createNarutoVisuals(parent: Entity): SummonVisuals {
    const layerOpt = this.getLayerOption();
    const { shadowRoot, baseRing, ringMaterial, bodyRoot } = this.createCommonBases(
      parent,
      '#fdba74',
      '#f97316'
    );

    const suitOrange = this.createMat({ diffuse: '#f97316', emissive: '#c2410c', emissiveIntensity: 0.2, gloss: 0.4 });
    const blueAccents = this.createMat({ diffuse: '#1e3a8a', gloss: 0.5 });
    const metalPlate = this.createMat({ diffuse: '#94a3b8', emissive: '#cbd5e1', emissiveIntensity: 0.4, gloss: 0.9 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.3 });
    const hairBlond = this.createMat({ diffuse: '#fde047', emissive: '#eab308', emissiveIntensity: 0.4, gloss: 0.7 });

    const legs = new Entity('Legs');
    legs.setPosition(0, 0.24, 0);
    legs.setLocalScale(0.30, 0.38, 0.24);
    legs.addComponent('render', { type: 'box', material: suitOrange, ...layerOpt });
    bodyRoot.addChild(legs);

    const torso = new Entity('Torso');
    torso.setPosition(0, 0.60, 0);
    torso.setLocalScale(0.36, 0.34, 0.24);
    torso.addComponent('render', { type: 'box', material: suitOrange, ...layerOpt });
    bodyRoot.addChild(torso);

    // Blue Shoulder/Chest yoke
    const yoke = new Entity('Yoke');
    yoke.setPosition(0, 0.70, 0);
    yoke.setLocalScale(0.38, 0.12, 0.26);
    yoke.addComponent('render', { type: 'box', material: blueAccents, ...layerOpt });
    bodyRoot.addChild(yoke);

    const head = new Entity('Head');
    head.setPosition(0, 0.88, 0);
    head.setLocalScale(0.24, 0.24, 0.24);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    // Forehead Protector (Band + Metal Plate)
    const headband = new Entity('Headband');
    headband.setPosition(0, 0.92, 0.02);
    headband.setLocalScale(0.26, 0.08, 0.26);
    headband.addComponent('render', { type: 'cylinder', material: blueAccents, ...layerOpt });
    bodyRoot.addChild(headband);

    const plate = new Entity('Plate');
    plate.setPosition(0, 0.92, 0.14);
    plate.setLocalScale(0.14, 0.06, 0.02);
    plate.addComponent('render', { type: 'box', material: metalPlate, ...layerOpt });
    bodyRoot.addChild(plate);

    // Spiky Blond Hair
    const hair = new Entity('Hair');
    hair.setPosition(0, 1.02, 0);
    hair.setLocalScale(0.26, 0.16, 0.26);
    hair.addComponent('render', { type: 'cone', material: hairBlond, ...layerOpt });
    bodyRoot.addChild(hair);

    return { bodyRoot, baseRing, shadowRoot, ringMaterial };
  }

  createLuffyVisuals(parent: Entity): SummonVisuals {
    const layerOpt = this.getLayerOption();
    const { shadowRoot, baseRing, ringMaterial, bodyRoot } = this.createCommonBases(
      parent,
      '#fca5a5',
      '#ef4444'
    );

    const vestRed = this.createMat({ diffuse: '#dc2626', emissive: '#991b1b', emissiveIntensity: 0.2, gloss: 0.4 });
    const shortsBlue = this.createMat({ diffuse: '#2563eb', gloss: 0.4 });
    const strawYellow = this.createMat({ diffuse: '#eab308', emissive: '#ca8a04', emissiveIntensity: 0.3, gloss: 0.6 });
    const hatBandRed = this.createMat({ diffuse: '#b91c1c', gloss: 0.5 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.3 });
    const hairBlack = this.createMat({ diffuse: '#18181b', gloss: 0.6 });

    const legs = new Entity('Legs');
    legs.setPosition(0, 0.24, 0);
    legs.setLocalScale(0.28, 0.36, 0.22);
    legs.addComponent('render', { type: 'box', material: shortsBlue, ...layerOpt });
    bodyRoot.addChild(legs);

    const torso = new Entity('Torso');
    torso.setPosition(0, 0.58, 0);
    torso.setLocalScale(0.34, 0.32, 0.22);
    torso.addComponent('render', { type: 'box', material: vestRed, ...layerOpt });
    bodyRoot.addChild(torso);

    const head = new Entity('Head');
    head.setPosition(0, 0.86, 0);
    head.setLocalScale(0.23, 0.23, 0.23);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const hair = new Entity('Hair');
    hair.setPosition(0, 0.94, -0.02);
    hair.setLocalScale(0.25, 0.12, 0.25);
    hair.addComponent('render', { type: 'sphere', material: hairBlack, ...layerOpt });
    bodyRoot.addChild(hair);

    // Straw Hat Brim & Dome
    const brim = new Entity('HatBrim');
    brim.setPosition(0, 0.98, 0);
    brim.setLocalScale(0.50, 0.03, 0.50);
    brim.addComponent('render', { type: 'cylinder', material: strawYellow, ...layerOpt });
    bodyRoot.addChild(brim);

    const dome = new Entity('HatDome');
    dome.setPosition(0, 1.04, 0);
    dome.setLocalScale(0.26, 0.10, 0.26);
    dome.addComponent('render', { type: 'cylinder', material: strawYellow, ...layerOpt });
    bodyRoot.addChild(dome);

    const hatBand = new Entity('HatBand');
    hatBand.setPosition(0, 1.00, 0);
    hatBand.setLocalScale(0.28, 0.03, 0.28);
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

    const capeGreen = this.createMat({ diffuse: '#15803d', emissive: '#166534', emissiveIntensity: 0.3, gloss: 0.4 });
    const jacketBrown = this.createMat({ diffuse: '#78350f', gloss: 0.4 });
    const pantsWhite = this.createMat({ diffuse: '#f8fafc', gloss: 0.3 });
    const hairBrown = this.createMat({ diffuse: '#451a03', gloss: 0.5 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.3 });

    const legs = new Entity('Legs');
    legs.setPosition(0, 0.24, 0);
    legs.setLocalScale(0.30, 0.38, 0.24);
    legs.addComponent('render', { type: 'box', material: pantsWhite, ...layerOpt });
    bodyRoot.addChild(legs);

    const torso = new Entity('Torso');
    torso.setPosition(0, 0.60, 0);
    torso.setLocalScale(0.36, 0.34, 0.24);
    torso.addComponent('render', { type: 'box', material: jacketBrown, ...layerOpt });
    bodyRoot.addChild(torso);

    // Scout Regiment Green Cloak / Cape
    const cape = new Entity('Cape');
    cape.setPosition(0, 0.56, -0.14);
    cape.setEulerAngles(12, 0, 0);
    cape.setLocalScale(0.42, 0.48, 0.06);
    cape.addComponent('render', { type: 'box', material: capeGreen, ...layerOpt });
    bodyRoot.addChild(cape);

    const head = new Entity('Head');
    head.setPosition(0, 0.88, 0);
    head.setLocalScale(0.24, 0.24, 0.24);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const hair = new Entity('Hair');
    hair.setPosition(0, 0.98, -0.02);
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

    const shirtWhite = this.createMat({ diffuse: '#f1f5f9', emissive: '#e2e8f0', emissiveIntensity: 0.2, gloss: 0.3 });
    const jeansBlue = this.createMat({ diffuse: '#334155', gloss: 0.4 });
    const hairBlack = this.createMat({ diffuse: '#09090b', gloss: 0.8 });
    const skinMat = this.createMat({ diffuse: '#ffedd5', gloss: 0.2 });

    const legs = new Entity('Legs');
    legs.setPosition(0, 0.22, 0);
    legs.setLocalScale(0.28, 0.36, 0.24);
    legs.addComponent('render', { type: 'box', material: jeansBlue, ...layerOpt });
    bodyRoot.addChild(legs);

    // Loose White Long-Sleeve Shirt (slouched stance)
    const torso = new Entity('Torso');
    torso.setPosition(0, 0.58, 0.02);
    torso.setEulerAngles(8, 0, 0); // Slight slouch forward
    torso.setLocalScale(0.38, 0.36, 0.28);
    torso.addComponent('render', { type: 'box', material: shirtWhite, ...layerOpt });
    bodyRoot.addChild(torso);

    const head = new Entity('Head');
    head.setPosition(0, 0.86, 0.06);
    head.setLocalScale(0.23, 0.23, 0.23);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    // Shaggy Dark Hair
    const hair = new Entity('Hair');
    hair.setPosition(0, 0.94, 0.04);
    hair.setLocalScale(0.30, 0.18, 0.28);
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

    const cloakBlack = this.createMat({ diffuse: '#0f172a', emissive: '#3b0764', emissiveIntensity: 0.3, gloss: 0.7 });
    const purpleTrim = this.createMat({ diffuse: '#6b21a8', emissive: '#a855f7', emissiveIntensity: 0.5, gloss: 0.8 });
    const goldTrim = this.createMat({ diffuse: '#eab308', emissive: '#ca8a04', emissiveIntensity: 0.6, gloss: 0.9 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.3 });
    const hairDark = this.createMat({ diffuse: '#1e1b4b', gloss: 0.7 });

    const legs = new Entity('Legs');
    legs.setPosition(0, 0.24, 0);
    legs.setLocalScale(0.28, 0.38, 0.24);
    legs.addComponent('render', { type: 'box', material: cloakBlack, ...layerOpt });
    bodyRoot.addChild(legs);

    const torso = new Entity('Torso');
    torso.setPosition(0, 0.60, 0);
    torso.setLocalScale(0.36, 0.34, 0.26);
    torso.addComponent('render', { type: 'box', material: cloakBlack, ...layerOpt });
    bodyRoot.addChild(torso);

    // High Zero Collar (Purple & Gold)
    const collar = new Entity('HighCollar');
    collar.setPosition(0, 0.80, -0.06);
    collar.setEulerAngles(-18, 0, 0);
    collar.setLocalScale(0.40, 0.24, 0.08);
    collar.addComponent('render', { type: 'box', material: purpleTrim, ...layerOpt });
    bodyRoot.addChild(collar);

    const goldAccent = new Entity('GoldTrim');
    goldAccent.setPosition(0, 0.62, 0.14);
    goldAccent.setLocalScale(0.12, 0.26, 0.02);
    goldAccent.addComponent('render', { type: 'box', material: goldTrim, ...layerOpt });
    bodyRoot.addChild(goldAccent);

    const head = new Entity('Head');
    head.setPosition(0, 0.88, 0);
    head.setLocalScale(0.23, 0.23, 0.23);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    const hair = new Entity('Hair');
    hair.setPosition(0, 0.98, -0.02);
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
