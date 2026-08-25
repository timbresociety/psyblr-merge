import {
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';

export type CreepKind = 'creep_brute' | 'creep_scout' | 'creep_shooter' | 'mini_boss' | 'main_boss';

export class CreepPresenter {
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

  createVisuals(kind: CreepKind, parent: Entity): Entity {
    const layerOpt = this.getLayerOption();
    const bodyRoot = new Entity(`CreepBody_${kind}`);
    parent.addChild(bodyRoot);

    // Ground Contact Shadow
    const shadowRoot = new Entity('ContactShadow');
    shadowRoot.setLocalPosition(0, 0.025, 0);
    shadowRoot.setLocalScale(0.75, 0.005, 0.75);
    const shadowMat = this.createMat({ diffuse: '#000000', opacity: 0.45, blendType: 1 });
    shadowRoot.addComponent('render', { type: 'cylinder', material: shadowMat, ...layerOpt });
    parent.addChild(shadowRoot);

    switch (kind) {
      case 'creep_brute': {
        // Heavy armor creep (Dark Iron & Crimson)
        const armorMat = this.createMat({ diffuse: '#334155', emissive: '#1e293b', emissiveIntensity: 0.2, gloss: 0.6 });
        const coreMat = this.createMat({ diffuse: '#dc2626', emissive: '#ef4444', emissiveIntensity: 0.7, gloss: 0.8 });

        const legs = new Entity('BruteLegs');
        legs.setLocalPosition(0, 0.2, 0);
        legs.setLocalScale(0.38, 0.35, 0.32);
        legs.addComponent('render', { type: 'box', material: armorMat, ...layerOpt });
        bodyRoot.addChild(legs);

        const torso = new Entity('BruteTorso');
        torso.setLocalPosition(0, 0.6, 0);
        torso.setLocalScale(0.48, 0.45, 0.36);
        torso.addComponent('render', { type: 'box', material: armorMat, ...layerOpt });
        bodyRoot.addChild(torso);

        const core = new Entity('BruteCore');
        core.setLocalPosition(0, 0.65, 0.16);
        core.setLocalScale(0.2, 0.2, 0.1);
        core.addComponent('render', { type: 'box', material: coreMat, ...layerOpt });
        bodyRoot.addChild(core);

        const head = new Entity('BruteHead');
        head.setLocalPosition(0, 0.95, 0);
        head.setLocalScale(0.26, 0.24, 0.26);
        head.addComponent('render', { type: 'box', material: armorMat, ...layerOpt });
        bodyRoot.addChild(head);
        break;
      }

      case 'creep_scout': {
        // Fast agile scout (Dark Slate & Electric Emerald)
        const bodyMat = this.createMat({ diffuse: '#1e293b', emissive: '#0f172a', emissiveIntensity: 0.2, gloss: 0.7 });
        const neonMat = this.createMat({ diffuse: '#10b981', emissive: '#34d399', emissiveIntensity: 0.8, gloss: 0.9 });

        const legs = new Entity('ScoutLegs');
        legs.setLocalPosition(0, 0.22, 0);
        legs.setLocalScale(0.24, 0.4, 0.22);
        legs.addComponent('render', { type: 'box', material: bodyMat, ...layerOpt });
        bodyRoot.addChild(legs);

        const torso = new Entity('ScoutTorso');
        torso.setLocalPosition(0, 0.58, 0);
        torso.setLocalScale(0.3, 0.34, 0.22);
        torso.addComponent('render', { type: 'box', material: bodyMat, ...layerOpt });
        bodyRoot.addChild(torso);

        const visor = new Entity('ScoutVisor');
        visor.setLocalPosition(0, 0.82, 0.1);
        visor.setLocalScale(0.2, 0.08, 0.08);
        visor.addComponent('render', { type: 'box', material: neonMat, ...layerOpt });
        bodyRoot.addChild(visor);

        const head = new Entity('ScoutHead');
        head.setLocalPosition(0, 0.82, 0);
        head.setLocalScale(0.2, 0.2, 0.2);
        head.addComponent('render', { type: 'sphere', material: bodyMat, ...layerOpt });
        bodyRoot.addChild(head);
        break;
      }

      case 'creep_shooter': {
        // Ranged sniper creep (Dark Indigo & Cyan Optics)
        const frameMat = this.createMat({ diffuse: '#1e1b4b', emissive: '#312e81', emissiveIntensity: 0.25, gloss: 0.65 });
        const cyanMat = this.createMat({ diffuse: '#0284c7', emissive: '#38bdf8', emissiveIntensity: 0.85, gloss: 0.95 });

        const base = new Entity('ShooterBase');
        base.setLocalPosition(0, 0.25, 0);
        base.setLocalScale(0.28, 0.45, 0.26);
        base.addComponent('render', { type: 'cylinder', material: frameMat, ...layerOpt });
        bodyRoot.addChild(base);

        const barrel = new Entity('ShooterGun');
        barrel.setLocalPosition(0.2, 0.6, 0.2);
        barrel.setLocalScale(0.1, 0.1, 0.45);
        barrel.addComponent('render', { type: 'box', material: cyanMat, ...layerOpt });
        bodyRoot.addChild(barrel);

        const head = new Entity('ShooterHead');
        head.setLocalPosition(0, 0.8, 0);
        head.setLocalScale(0.22, 0.22, 0.22);
        head.addComponent('render', { type: 'box', material: frameMat, ...layerOpt });
        bodyRoot.addChild(head);
        break;
      }

      case 'mini_boss': {
        // Mini-Boss (Enraged Commander with Horns & Gold Trim)
        shadowRoot.setLocalScale(1.1, 0.005, 1.1);
        const bossArmorMat = this.createMat({ diffuse: '#450a0a', emissive: '#991b1b', emissiveIntensity: 0.4, gloss: 0.75 });
        const goldMat = this.createMat({ diffuse: '#b45309', emissive: '#fbbf24', emissiveIntensity: 0.8, gloss: 0.9 });

        const legs = new Entity('BossLegs');
        legs.setLocalPosition(0, 0.25, 0);
        legs.setLocalScale(0.48, 0.48, 0.42);
        legs.addComponent('render', { type: 'box', material: bossArmorMat, ...layerOpt });
        bodyRoot.addChild(legs);

        const torso = new Entity('BossTorso');
        torso.setLocalPosition(0, 0.75, 0);
        torso.setLocalScale(0.62, 0.55, 0.48);
        torso.addComponent('render', { type: 'box', material: bossArmorMat, ...layerOpt });
        bodyRoot.addChild(torso);

        const crest = new Entity('BossCrest');
        crest.setLocalPosition(0, 0.82, 0.22);
        crest.setLocalScale(0.3, 0.3, 0.12);
        crest.addComponent('render', { type: 'box', material: goldMat, ...layerOpt });
        bodyRoot.addChild(crest);

        const head = new Entity('BossHead');
        head.setLocalPosition(0, 1.15, 0);
        head.setLocalScale(0.32, 0.32, 0.32);
        head.addComponent('render', { type: 'sphere', material: bossArmorMat, ...layerOpt });
        bodyRoot.addChild(head);

        const hornL = new Entity('HornL');
        hornL.setLocalPosition(-0.2, 1.35, 0);
        hornL.setEulerAngles(-10, 0, 30);
        hornL.setLocalScale(0.1, 0.3, 0.1);
        hornL.addComponent('render', { type: 'cone', material: goldMat, ...layerOpt });
        bodyRoot.addChild(hornL);

        const hornR = new Entity('HornR');
        hornR.setLocalPosition(0.2, 1.35, 0);
        hornR.setEulerAngles(-10, 0, -30);
        hornR.setLocalScale(0.1, 0.3, 0.1);
        hornR.addComponent('render', { type: 'cone', material: goldMat, ...layerOpt });
        bodyRoot.addChild(hornR);
        break;
      }

      case 'main_boss':
      default: {
        // Colossal Story Boss (Dark Obsidian Titan with Cosmic Purple/Gold Wings)
        shadowRoot.setLocalScale(1.6, 0.005, 1.6);
        const titanMat = this.createMat({ diffuse: '#0f172a', emissive: '#3b0764', emissiveIntensity: 0.6, gloss: 0.85 });
        const cosmicMat = this.createMat({ diffuse: '#7c3aed', emissive: '#c084fc', emissiveIntensity: 1.2, gloss: 0.95 });
        const goldMat = this.createMat({ diffuse: '#d97706', emissive: '#fbbf24', emissiveIntensity: 0.9, gloss: 0.95 });

        const legs = new Entity('TitanLegs');
        legs.setLocalPosition(0, 0.35, 0);
        legs.setLocalScale(0.65, 0.65, 0.55);
        legs.addComponent('render', { type: 'box', material: titanMat, ...layerOpt });
        bodyRoot.addChild(legs);

        const torso = new Entity('TitanTorso');
        torso.setLocalPosition(0, 0.95, 0);
        torso.setLocalScale(0.85, 0.72, 0.62);
        torso.addComponent('render', { type: 'box', material: titanMat, ...layerOpt });
        bodyRoot.addChild(torso);

        const core = new Entity('TitanCore');
        core.setLocalPosition(0, 1.05, 0.3);
        core.setLocalScale(0.35, 0.35, 0.15);
        core.addComponent('render', { type: 'box', material: cosmicMat, ...layerOpt });
        bodyRoot.addChild(core);

        const head = new Entity('TitanHead');
        head.setLocalPosition(0, 1.45, 0);
        head.setLocalScale(0.42, 0.42, 0.42);
        head.addComponent('render', { type: 'sphere', material: titanMat, ...layerOpt });
        bodyRoot.addChild(head);

        const crown = new Entity('TitanCrown');
        crown.setLocalPosition(0, 1.7, 0);
        crown.setLocalScale(0.55, 0.15, 0.55);
        crown.addComponent('render', { type: 'cylinder', material: goldMat, ...layerOpt });
        bodyRoot.addChild(crown);

        const wingL = new Entity('TitanWingL');
        wingL.setLocalPosition(-0.65, 1.15, -0.25);
        wingL.setEulerAngles(15, -25, 45);
        wingL.setLocalScale(0.12, 0.85, 0.45);
        wingL.addComponent('render', { type: 'box', material: cosmicMat, ...layerOpt });
        bodyRoot.addChild(wingL);

        const wingR = new Entity('TitanWingR');
        wingR.setLocalPosition(0.65, 1.15, -0.25);
        wingR.setEulerAngles(15, 25, -45);
        wingR.setLocalScale(0.12, 0.85, 0.45);
        wingR.addComponent('render', { type: 'box', material: cosmicMat, ...layerOpt });
        bodyRoot.addChild(wingR);
        break;
      }
    }

    return bodyRoot;
  }

  destroy(): void {
    for (const mat of this.materials) {
      mat.destroy();
    }
    this.materials.length = 0;
  }
}
