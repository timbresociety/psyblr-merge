import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import { campCellToWorld, CAMP_CELL_SIZE } from './CampCoordinateMapper';
import { CAMP_SIZE } from '@psyblr/game-rules';
import { baseLayoutDefinition } from '@psyblr/game-content';

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
  private materials: StandardMaterial[] = [];
  private floatingObjects: FloatingObject[] = [];
  private time: number = 0;

  constructor(private app: Application, private worldLayer?: Layer) {
    this.root = new Entity('BaseWorld_Root');
    this.app.root.addChild(this.root);

    this.buildLighting();
    this.buildTerrain();
    this.buildCampPlatform();
    this.buildBuildingSockets();
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
    if (options.diffuse) {
      mat.diffuse = typeof options.diffuse === 'string' ? new Color().fromString(options.diffuse) : options.diffuse;
    }
    if (options.emissive) {
      mat.emissive = typeof options.emissive === 'string' ? new Color().fromString(options.emissive) : options.emissive;
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
    // Key Light (Directional with shadows)
    const keyLight = new Entity('KeyLight');
    keyLight.setEulerAngles(52, 35, 0);
    keyLight.addComponent('light', {
      type: 'directional',
      color: new Color(1.0, 0.96, 0.90),
      intensity: 1.65,
      castShadows: true,
      shadowBias: 0.05,
      normalOffsetBias: 0.05,
      shadowDistance: 32,
      shadowResolution: 2048,
    });
    this.root.addChild(keyLight);

    // Fill Light (Cool ambient fill)
    const fillLight = new Entity('FillLight');
    fillLight.setEulerAngles(-30, -125, 0);
    fillLight.addComponent('light', {
      type: 'directional',
      color: new Color(0.45, 0.60, 0.95),
      intensity: 0.7,
      castShadows: false,
    });
    this.root.addChild(fillLight);

    // Rim/Bottom Bounce Light
    const bounceLight = new Entity('BounceLight');
    bounceLight.setEulerAngles(-80, 0, 0);
    bounceLight.addComponent('light', {
      type: 'directional',
      color: new Color(0.25, 0.35, 0.6),
      intensity: 0.35,
      castShadows: false,
    });
    this.root.addChild(bounceLight);
  }

  private buildTerrain(): void {
    const layerOpt = this.getLayerOption();

    // Outer Abyss / Deep Foundation Plinth
    const abyssMat = this.createMaterial({ diffuse: '#070b16', gloss: 0.1 });
    const outerPlinth = new Entity('OuterPlinth');
    outerPlinth.setPosition(0, -0.6, 0);
    outerPlinth.setLocalScale(26, 0.6, 20);
    outerPlinth.addComponent('render', {
      type: 'box',
      material: abyssMat,
      ...layerOpt,
    });
    this.root.addChild(outerPlinth);

    // Floating Island Diorama Base (Stepped stone podium)
    const islandMat = this.createMaterial({ diffuse: '#0e1628', gloss: 0.3 });
    const islandBase = new Entity('IslandBase');
    islandBase.setPosition(0, -0.18, 0);
    islandBase.setLocalScale(18.5, 0.36, 14.5);
    islandBase.addComponent('render', {
      type: 'box',
      material: islandMat,
      ...layerOpt,
    });
    this.root.addChild(islandBase);

    // Island Top Rim Accent (Cyan glow rim)
    const rimMat = this.createMaterial({
      diffuse: '#1e293b',
      emissive: '#0284c7',
      emissiveIntensity: 0.35,
      gloss: 0.7,
    });
    const rimEntity = new Entity('IslandRim');
    rimEntity.setPosition(0, 0.01, 0);
    rimEntity.setLocalScale(18.7, 0.02, 14.7);
    rimEntity.addComponent('render', {
      type: 'box',
      material: rimMat,
      ...layerOpt,
    });
    this.root.addChild(rimEntity);
  }

  private buildCampPlatform(): void {
    const layerOpt = this.getLayerOption();
    const campWidth = CAMP_SIZE * CAMP_CELL_SIZE; // 7.5
    const campDepth = CAMP_SIZE * CAMP_CELL_SIZE; // 7.5

    // Raised Camp Stone Slab
    const campSlabMat = this.createMaterial({ diffuse: '#151f32', gloss: 0.4 });
    const campSlab = new Entity('CampSlab');
    campSlab.setPosition(0, -0.02, 0);
    campSlab.setLocalScale(campWidth + 0.5, 0.08, campDepth + 0.5);
    campSlab.addComponent('render', {
      type: 'box',
      material: campSlabMat,
      ...layerOpt,
    });
    this.root.addChild(campSlab);

    // Inner Arena Surface
    const arenaMat = this.createMaterial({ diffuse: '#18243b', gloss: 0.5 });
    const arenaSurface = new Entity('ArenaSurface');
    arenaSurface.setPosition(0, 0.01, 0);
    arenaSurface.setLocalScale(campWidth, 0.02, campDepth);
    arenaSurface.addComponent('render', {
      type: 'box',
      material: arenaMat,
      ...layerOpt,
    });
    this.root.addChild(arenaSurface);

    // Arena Gold Inlay Border
    const borderMat = this.createMaterial({
      diffuse: '#78350f',
      emissive: '#f59e0b',
      emissiveIntensity: 0.28,
      gloss: 0.8,
    });
    const arenaBorder = new Entity('ArenaBorder');
    arenaBorder.setPosition(0, 0.012, 0);
    arenaBorder.setLocalScale(campWidth + 0.08, 0.01, campDepth + 0.08);
    arenaBorder.addComponent('render', {
      type: 'box',
      material: borderMat,
      ...layerOpt,
    });
    this.root.addChild(arenaBorder);

    // Illuminati Row (Row 0) Distinct Aura Platform (Emerald glow)
    const illuminatiMat = this.createMaterial({
      diffuse: '#064e3b',
      emissive: '#10b981',
      emissiveIntensity: 0.45,
      gloss: 0.8,
    });
    const illuminatiRow = new Entity('IlluminatiRowPlinth');
    illuminatiRow.setPosition(0, 0.018, (0 - 2.5) * CAMP_CELL_SIZE);
    illuminatiRow.setLocalScale(campWidth - 0.04, 0.015, CAMP_CELL_SIZE - 0.04);
    illuminatiRow.addComponent('render', {
      type: 'box',
      material: illuminatiMat,
      ...layerOpt,
    });
    this.root.addChild(illuminatiRow);

    // Subtle cell grid corner markers
    const dotMat = this.createMaterial({
      diffuse: '#64748b',
      emissive: '#94a3b8',
      emissiveIntensity: 0.35,
      gloss: 0.6,
    });

    const gridContainer = new Entity('CampGridDots');
    this.root.addChild(gridContainer);

    for (let x = 0; x <= CAMP_SIZE; x++) {
      for (let y = 0; y <= CAMP_SIZE; y++) {
        const wx = (x - CAMP_SIZE / 2) * CAMP_CELL_SIZE;
        const wz = (y - CAMP_SIZE / 2) * CAMP_CELL_SIZE;

        const dot = new Entity(`GridDot_${x}_${y}`);
        dot.setPosition(wx, 0.024, wz);
        dot.setLocalScale(0.06, 0.01, 0.06);
        dot.addComponent('render', {
          type: 'box',
          material: dotMat,
          ...layerOpt,
        });
        gridContainer.addChild(dot);
      }
    }
  }

  private buildBuildingSockets(): void {
    const layerOpt = this.getLayerOption();

    for (const socket of baseLayoutDefinition.buildingSockets) {
      if (socket.kind === 'battle_camp') continue;

      const socketRoot = new Entity(`Socket_${socket.id}`);
      socketRoot.setPosition(socket.position[0], socket.position[1], socket.position[2]);
      socketRoot.setEulerAngles(0, socket.rotationY, 0);
      this.root.addChild(socketRoot);

      const socketColor = socket.kind === 'spawn_machine'
        ? '#f59e0b'
        : socket.kind === 'raid_gate'
        ? '#ef4444'
        : '#6366f1';

      const pedestalMat = this.createMaterial({
        diffuse: '#131e33',
        emissive: socketColor,
        emissiveIntensity: 0.22,
        gloss: 0.6,
      });

      const pedestal = new Entity('Pedestal');
      pedestal.setPosition(0, 0.04, 0);
      pedestal.setLocalScale(socket.footprint[0], 0.08, socket.footprint[1]);
      pedestal.addComponent('render', {
        type: 'cylinder',
        material: pedestalMat,
        ...layerOpt,
      });
      socketRoot.addChild(pedestal);

      if (socket.kind === 'spawn_machine') {
        const spawnMat = this.createMaterial({
          diffuse: '#f59e0b',
          emissive: '#d97706',
          emissiveIntensity: 0.6,
          gloss: 0.8,
        });
        const spawnCore = new Entity('SpawnMachineCore');
        spawnCore.setPosition(0, 0.6, 0);
        spawnCore.setLocalScale(0.7, 0.9, 0.7);
        spawnCore.addComponent('render', {
          type: 'cylinder',
          material: spawnMat,
          ...layerOpt,
        });
        socketRoot.addChild(spawnCore);

        const orb = new Entity('SpawnMachineOrb');
        orb.setPosition(0, 1.25, 0);
        orb.setLocalScale(0.5, 0.5, 0.5);
        orb.addComponent('render', {
          type: 'sphere',
          material: spawnMat,
          ...layerOpt,
        });
        socketRoot.addChild(orb);

        // Register floating orb for gentle ambient hover
        this.floatingObjects.push({
          entity: orb,
          baseY: 1.25,
          bobSpeed: 1.8,
          bobAmp: 0.06,
          rotSpeedY: 25,
          phase: 0,
        });
      } else if (socket.kind === 'raid_gate') {
        const gateMat = this.createMaterial({
          diffuse: '#991b1b',
          emissive: '#ef4444',
          emissiveIntensity: 0.5,
          gloss: 0.7,
        });
        const pillarL = new Entity('GatePillarL');
        pillarL.setPosition(-0.6, 0.75, 0);
        pillarL.setLocalScale(0.22, 1.5, 0.22);
        pillarL.addComponent('render', {
          type: 'box',
          material: gateMat,
          ...layerOpt,
        });
        socketRoot.addChild(pillarL);

        const pillarR = new Entity('GatePillarR');
        pillarR.setPosition(0.6, 0.75, 0);
        pillarR.setLocalScale(0.22, 1.5, 0.22);
        pillarR.addComponent('render', {
          type: 'box',
          material: gateMat,
          ...layerOpt,
        });
        socketRoot.addChild(pillarR);

        const archTop = new Entity('GateArchTop');
        archTop.setPosition(0, 1.55, 0);
        archTop.setLocalScale(1.45, 0.18, 0.25);
        archTop.addComponent('render', {
          type: 'box',
          material: gateMat,
          ...layerOpt,
        });
        socketRoot.addChild(archTop);

        // Floating portal rune in gate center
        const portalCrystal = new Entity('GateCrystal');
        portalCrystal.setPosition(0, 0.85, 0);
        portalCrystal.setLocalScale(0.3, 0.5, 0.15);
        portalCrystal.addComponent('render', {
          type: 'box',
          material: gateMat,
          ...layerOpt,
        });
        socketRoot.addChild(portalCrystal);

        this.floatingObjects.push({
          entity: portalCrystal,
          baseY: 0.85,
          bobSpeed: 2.2,
          bobAmp: 0.08,
          rotSpeedY: 45,
          phase: Math.PI / 2,
        });
      }
    }
  }

  private buildAmbientMonoliths(): void {
    const layerOpt = this.getLayerOption();

    const crystalMat = this.createMaterial({
      diffuse: '#0c4a6e',
      emissive: '#38bdf8',
      emissiveIntensity: 0.5,
      gloss: 0.9,
    });

    const positions: [number, number, number][] = [
      [-10.5, 0.8, -7.5],
      [10.5, 1.1, -7.0],
      [-11.0, 0.6, 7.0],
      [10.8, 0.9, 7.5],
    ];

    positions.forEach((pos, i) => {
      const monolith = new Entity(`AmbientMonolith_${i}`);
      monolith.setPosition(pos[0], pos[1], pos[2]);
      monolith.setLocalScale(0.45, 1.2, 0.45);
      monolith.addComponent('render', {
        type: 'cone',
        material: crystalMat,
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

  destroy(): void {
    this.root.destroy();
    for (const mat of this.materials) {
      mat.destroy();
    }
    this.materials.length = 0;
    this.floatingObjects.length = 0;
  }
}
