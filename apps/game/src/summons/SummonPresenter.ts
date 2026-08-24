import {
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import { getSummonDefinition } from '@psyblr/game-content';

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

  createGokuVisuals(parent: Entity): {
    bodyRoot: Entity;
    baseRing: Entity;
    shadowRoot: Entity;
    ringMaterial: StandardMaterial;
  } {
    const layerOpt = this.getLayerOption();

    // 1. Soft Ground Contact Shadow (placed flat on ground)
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

    // 2. Base Energy Ring (around feet)
    const baseRing = new Entity('BaseEnergyRing');
    baseRing.setPosition(0, 0.04, 0);
    baseRing.setLocalScale(0.68, 0.02, 0.68);
    const ringMaterial = this.createMat({
      diffuse: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 1.2,
      gloss: 0.8,
    });
    baseRing.addComponent('render', {
      type: 'cylinder',
      material: ringMaterial,
      ...layerOpt,
    });
    parent.addChild(baseRing);

    // 3. Character Body Root (for idle bobbing and squash/stretch)
    const bodyRoot = new Entity('BodyRoot');
    bodyRoot.setPosition(0, 0, 0);
    parent.addChild(bodyRoot);

    // Color Palettes for Goku Ascendant Striker
    const giOrange = this.createMat({ diffuse: '#ea580c', emissive: '#c2410c', emissiveIntensity: 0.15, gloss: 0.4 });
    const blueSash = this.createMat({ diffuse: '#1d4ed8', emissive: '#1e40af', emissiveIntensity: 0.2, gloss: 0.5 });
    const skinMat = this.createMat({ diffuse: '#fed7aa', gloss: 0.3 });
    const hairGold = this.createMat({ diffuse: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 0.8, gloss: 0.9 });

    // Lower Body / Legs
    const legs = new Entity('Legs');
    legs.setPosition(0, 0.24, 0);
    legs.setLocalScale(0.32, 0.38, 0.26);
    legs.addComponent('render', { type: 'box', material: giOrange, ...layerOpt });
    bodyRoot.addChild(legs);

    // Boots (Blue)
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

    // Belt / Sash
    const belt = new Entity('BeltSash');
    belt.setPosition(0, 0.44, 0);
    belt.setLocalScale(0.35, 0.08, 0.28);
    belt.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(belt);

    // Torso / Gi
    const torso = new Entity('Torso');
    torso.setPosition(0, 0.62, 0);
    torso.setLocalScale(0.38, 0.32, 0.26);
    torso.addComponent('render', { type: 'box', material: giOrange, ...layerOpt });
    bodyRoot.addChild(torso);

    // Undershirt (Blue chest accent)
    const chestUndershirt = new Entity('Undershirt');
    chestUndershirt.setPosition(0, 0.66, 0.04);
    chestUndershirt.setLocalScale(0.22, 0.22, 0.22);
    chestUndershirt.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(chestUndershirt);

    // Arms
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

    // Wristbands (Blue)
    const wristL = new Entity('WristL');
    wristL.setPosition(-0.25, 0.46, 0);
    wristL.setLocalScale(0.14, 0.08, 0.16);
    wristL.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(wristL);

    const wristR = new Entity('WristR');
    wristR.setPosition(0.25, 0.46, 0);
    wristR.setLocalScale(0.14, 0.08, 0.16);
    wristR.addComponent('render', { type: 'box', material: blueSash, ...layerOpt });
    bodyRoot.addChild(wristR);

    // Head
    const head = new Entity('Head');
    head.setPosition(0, 0.88, 0);
    head.setLocalScale(0.24, 0.24, 0.24);
    head.addComponent('render', { type: 'sphere', material: skinMat, ...layerOpt });
    bodyRoot.addChild(head);

    // Distinct Ascendant Spiky Hair Silhouettes
    const hairMain = new Entity('HairMain');
    hairMain.setPosition(0, 1.04, -0.02);
    hairMain.setLocalScale(0.32, 0.22, 0.28);
    hairMain.addComponent('render', { type: 'box', material: hairGold, ...layerOpt });
    bodyRoot.addChild(hairMain);

    // Front/Top Spikes
    const spikeTop = new Entity('SpikeTop');
    spikeTop.setPosition(0, 1.18, -0.04);
    spikeTop.setEulerAngles(-15, 0, 0);
    spikeTop.setLocalScale(0.18, 0.28, 0.18);
    spikeTop.addComponent('render', { type: 'cone', material: hairGold, ...layerOpt });
    bodyRoot.addChild(spikeTop);

    const spikeL = new Entity('SpikeL');
    spikeL.setPosition(-0.14, 1.12, 0);
    spikeL.setEulerAngles(-10, 0, 35);
    spikeL.setLocalScale(0.14, 0.26, 0.14);
    spikeL.addComponent('render', { type: 'cone', material: hairGold, ...layerOpt });
    bodyRoot.addChild(spikeL);

    const spikeR = new Entity('SpikeR');
    spikeR.setPosition(0.14, 1.12, 0);
    spikeR.setEulerAngles(-10, 0, -35);
    spikeR.setLocalScale(0.14, 0.26, 0.14);
    spikeR.addComponent('render', { type: 'cone', material: hairGold, ...layerOpt });
    bodyRoot.addChild(spikeR);

    // Face / Eye line indicator to clearly read forward facing (+Z)
    const eyeBand = new Entity('EyeBand');
    eyeBand.setPosition(0, 0.88, 0.12);
    eyeBand.setLocalScale(0.16, 0.04, 0.03);
    const eyeMat = this.createMat({ diffuse: '#0f172a', gloss: 0.9 });
    eyeBand.addComponent('render', { type: 'box', material: eyeMat, ...layerOpt });
    bodyRoot.addChild(eyeBand);

    return {
      bodyRoot,
      baseRing,
      shadowRoot,
      ringMaterial,
    };
  }

  destroy(): void {
    for (const mat of this.materials) {
      mat.destroy();
    }
    this.materials.length = 0;
  }
}
