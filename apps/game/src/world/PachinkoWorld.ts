import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import { colorFromHex } from '../presentation/ColorUtils';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import { DURATION, EASING } from '../presentation/PresentationTokens';

export interface PachinkoPin {
  entity: Entity;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface PachinkoBin {
  id: string;
  summonDefId: string;
  tier: string;
  probability: number;
  index: number;
  minX: number;
  maxX: number;
  centerX: number;
  entity: Entity;
  glowMaterial: StandardMaterial;
}

export interface PachinkoBumper {
  id: string;
  x: number;
  y: number;
  radius: number;
  entity: Entity;
  glowMaterial: StandardMaterial;
}

interface ActiveBall {
  entity: Entity;
  vx: number;
  vy: number;
  x: number;
  y: number;
  targetBinIndex: number;
  lastHitTime: number;
  lastBumperHitTime: number;
  active: boolean;
  intervalId?: any;
  onComplete?: ((bin: PachinkoBin) => void) | undefined;
}

export class PachinkoWorld {
  public root: Entity;
  public cabinetRoot: Entity;
  public plungerEntity: Entity;
  public pins: PachinkoPin[] = [];
  public bins: PachinkoBin[] = [];
  public bumpers: PachinkoBumper[] = [];

  private ballPool: ActiveBall[] = [];
  private materials: StandardMaterial[] = [];

  public static readonly ORIGIN = [6.4, 0, 0] as const;

  // Callback when ball strikes a shield bumper
  public onBumperHit?: (bumperId: string) => void;

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private audio: AudioDirector,
    private events: PresentationEventEmitter,
    private worldLayer?: Layer
  ) {
    const layerOpt = this.worldLayer ? { layers: [this.worldLayer.id] } : {};

    this.root = new Entity('Pachinko_World_Root');
    this.root.setPosition(PachinkoWorld.ORIGIN[0], PachinkoWorld.ORIGIN[1], PachinkoWorld.ORIGIN[2]);
    this.app.root.addChild(this.root);

    // 1. Cabinet Backboard with clean front angle
    this.cabinetRoot = new Entity('CabinetRoot');
    this.cabinetRoot.setEulerAngles(-14, 0, 0);
    this.cabinetRoot.setPosition(0, 1.85, 0);
    this.root.addChild(this.cabinetRoot);

    const cabinetMat = this.createMat({
      diffuse: '#090d1f',
      emissive: '#171233',
      emissiveIntensity: 0.35,
      gloss: 0.85,
    });
    const frameMat = this.createMat({
      diffuse: '#b45309',
      emissive: '#f59e0b',
      emissiveIntensity: 0.65,
      gloss: 0.95,
    });
    const accentMat = this.createMat({
      diffuse: '#0284c7',
      emissive: '#38bdf8',
      emissiveIntensity: 0.8,
      gloss: 0.9,
    });
    const pinMat = this.createMat({
      diffuse: '#fef08a',
      emissive: '#facc15',
      emissiveIntensity: 0.75,
      gloss: 0.98,
    });

    // Board Backplane (3.4 width x 4.6 height)
    const board = new Entity('PlayfieldBoard');
    board.setPosition(0, 0, 0);
    board.setLocalScale(3.4, 4.6, 0.1);
    board.addComponent('render', { type: 'box', material: cabinetMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(board);

    // Outer Cabinet Housing Box (creates deep arcade feel)
    const housingMat = this.createMat({
      diffuse: '#1e1b4b',
      emissive: '#312e81',
      emissiveIntensity: 0.2,
      gloss: 0.8,
    });
    const housing = new Entity('ArcadeHousing');
    housing.setPosition(0, 0, -0.15);
    housing.setLocalScale(3.68, 4.88, 0.22);
    housing.addComponent('render', { type: 'box', material: housingMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(housing);

    // Left Outer & Inner Framing Borders
    const leftWall = new Entity('LeftWall');
    leftWall.setPosition(-1.66, 0, 0.1);
    leftWall.setLocalScale(0.12, 4.6, 0.28);
    leftWall.addComponent('render', { type: 'box', material: frameMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(leftWall);

    const leftTrim = new Entity('LeftNeonTrim');
    leftTrim.setPosition(-1.58, 0, 0.14);
    leftTrim.setLocalScale(0.04, 4.4, 0.18);
    leftTrim.addComponent('render', { type: 'box', material: accentMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(leftTrim);

    // Right Outer & Inner Framing Borders
    const rightWall = new Entity('RightWall');
    rightWall.setPosition(1.66, 0, 0.1);
    rightWall.setLocalScale(0.12, 4.6, 0.28);
    rightWall.addComponent('render', { type: 'box', material: frameMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(rightWall);

    const rightTrim = new Entity('RightNeonTrim');
    rightTrim.setPosition(1.58, 0, 0.14);
    rightTrim.setLocalScale(0.04, 4.4, 0.18);
    rightTrim.addComponent('render', { type: 'box', material: accentMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(rightTrim);

    // Top Arched Canopy Header
    const topArch = new Entity('TopArch');
    topArch.setPosition(0, 2.32, 0.1);
    topArch.setLocalScale(3.44, 0.16, 0.28);
    topArch.addComponent('render', { type: 'box', material: frameMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(topArch);

    // Arcade Crown Header / Star Bulbs along Top Arch
    const crownMat = this.createMat({
      diffuse: '#dc2626',
      emissive: '#f87171',
      emissiveIntensity: 0.8,
      gloss: 0.9,
    });
    const topCrown = new Entity('TopCrown');
    topCrown.setPosition(0, 2.44, 0.12);
    topCrown.setLocalScale(2.8, 0.12, 0.24);
    topCrown.addComponent('render', { type: 'box', material: crownMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(topCrown);

    // Decorative Star Light Bulbs on Crown
    const starBulbCount = 7;
    for (let s = 0; s < starBulbCount; s++) {
      const bulbX = -1.1 + s * 0.366;
      const bulb = new Entity(`StarBulb_${s}`);
      bulb.setPosition(bulbX, 2.45, 0.24);
      bulb.setLocalScale(0.1, 0.1, 0.1);
      bulb.addComponent('render', { type: 'sphere', material: pinMat, castShadows: false, ...layerOpt });
      this.cabinetRoot.addChild(bulb);
    }

    // 2. Pins Matrix (Staggered Diamond Layout)
    const pinRows = 8;
    const startY = 1.45;
    const rowSpacing = 0.32;
    const pinSpacing = 0.36;

    for (let r = 0; r < pinRows; r++) {
      const pinCount = r % 2 === 0 ? 7 : 6;
      const rowY = startY - r * rowSpacing;
      const offsetX = -((pinCount - 1) * pinSpacing) / 2;

      for (let p = 0; p < pinCount; p++) {
        const pinX = offsetX + p * pinSpacing;

        // Skip pins that would collide with the bumpers
        const distToBumperL = Math.hypot(pinX - (-0.72), rowY - 0.25);
        const distToBumperR = Math.hypot(pinX - 0.72, rowY - 0.25);
        const distToCenterArch = Math.hypot(pinX - 0, rowY - (-0.5));
        if (distToBumperL < 0.28 || distToBumperR < 0.28 || distToCenterArch < 0.28) {
          continue;
        }

        const pinEnt = new Entity(`Pin_${r}_${p}`);
        pinEnt.setPosition(pinX, rowY, 0.09);
        pinEnt.setEulerAngles(90, 0, 0);
        pinEnt.setLocalScale(0.045, 0.14, 0.045);
        pinEnt.addComponent('render', { type: 'cylinder', material: pinMat, castShadows: false, ...layerOpt });
        this.cabinetRoot.addChild(pinEnt);

        this.pins.push({
          entity: pinEnt,
          x: pinX,
          y: rowY,
          z: 0.09,
          radius: 0.038,
        });
      }
    }

    // 3. Blob Bumpers (Clash of Critters Style)
    // Left Bumper
    const bumperMatL = this.createMat({ diffuse: '#0284c7', emissive: '#38bdf8', emissiveIntensity: 0.95, gloss: 0.98 });
    const bumperRingMatL = this.createMat({ diffuse: '#38bdf8', emissive: '#7dd3fc', emissiveIntensity: 0.8, gloss: 0.95 });
    const bumperL = new Entity('ShieldBumper_Left');
    bumperL.setPosition(-0.72, 0.25, 0.12);
    bumperL.setLocalScale(0.32, 0.32, 0.32);
    bumperL.addComponent('render', { type: 'sphere', material: bumperMatL, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(bumperL);

    const ringL = new Entity('BumperRing_Left');
    ringL.setPosition(-0.72, 0.25, 0.09);
    ringL.setEulerAngles(90, 0, 0);
    ringL.setLocalScale(0.44, 0.06, 0.44);
    ringL.addComponent('render', { type: 'cylinder', material: bumperRingMatL, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(ringL);

    this.bumpers.push({
      id: 'bumper_left',
      x: -0.72,
      y: 0.25,
      radius: 0.18,
      entity: bumperL,
      glowMaterial: bumperMatL,
    });

    // Right Bumper
    const bumperMatR = this.createMat({ diffuse: '#0284c7', emissive: '#38bdf8', emissiveIntensity: 0.95, gloss: 0.98 });
    const bumperRingMatR = this.createMat({ diffuse: '#38bdf8', emissive: '#7dd3fc', emissiveIntensity: 0.8, gloss: 0.95 });
    const bumperR = new Entity('ShieldBumper_Right');
    bumperR.setPosition(0.72, 0.25, 0.12);
    bumperR.setLocalScale(0.32, 0.32, 0.32);
    bumperR.addComponent('render', { type: 'sphere', material: bumperMatR, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(bumperR);

    const ringR = new Entity('BumperRing_Right');
    ringR.setPosition(0.72, 0.25, 0.09);
    ringR.setEulerAngles(90, 0, 0);
    ringR.setLocalScale(0.44, 0.06, 0.44);
    ringR.addComponent('render', { type: 'cylinder', material: bumperRingMatR, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(ringR);

    this.bumpers.push({
      id: 'bumper_right',
      x: 0.72,
      y: 0.25,
      radius: 0.18,
      entity: bumperR,
      glowMaterial: bumperMatR,
    });

    // Center Arch Deflector Bumper (Golden Mystery Feature)
    const centerBumperMat = this.createMat({ diffuse: '#d97706', emissive: '#fbbf24', emissiveIntensity: 0.9, gloss: 0.95 });
    const centerBumperRing = this.createMat({ diffuse: '#f59e0b', emissive: '#fef08a', emissiveIntensity: 0.85, gloss: 0.95 });
    const centerBumper = new Entity('ShieldBumper_Center');
    centerBumper.setPosition(0, -0.5, 0.12);
    centerBumper.setLocalScale(0.28, 0.28, 0.28);
    centerBumper.addComponent('render', { type: 'sphere', material: centerBumperMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(centerBumper);

    const ringC = new Entity('BumperRing_Center');
    ringC.setPosition(0, -0.5, 0.09);
    ringC.setEulerAngles(90, 0, 0);
    ringC.setLocalScale(0.38, 0.06, 0.38);
    ringC.addComponent('render', { type: 'cylinder', material: centerBumperRing, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(ringC);

    this.bumpers.push({
      id: 'bumper_center',
      x: 0,
      y: -0.5,
      radius: 0.16,
      entity: centerBumper,
      glowMaterial: centerBumperMat,
    });

    // 4. Six Bottom Reward Pockets (matching Daily Pool: [10%, 15%, 25%, 25%, 15%, 10%])
    const summonDefs = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch'];
    const binProbabilities = [10, 15, 25, 25, 15, 10];
    const binTiers = ['F', 'F', 'F', 'F', 'F', 'F'];
    const binColors = ['#f59e0b', '#f97316', '#ef4444', '#10b981', '#0284c7', '#a855f7'];
    const binWidth = 0.48;
    const binStartX = -((6 * binWidth) / 2) + binWidth / 2;
    const binY = -1.82;

    for (let i = 0; i < 6; i++) {
      const bX = binStartX + i * binWidth;
      const glowMat = this.createMat({
        diffuse: binColors[i]!,
        emissive: binColors[i]!,
        emissiveIntensity: 0.7,
        gloss: 0.85,
      });

      // Pocket illuminated floor / base box
      const binEnt = new Entity(`Bin_${summonDefs[i]}`);
      binEnt.setPosition(bX, binY, 0.09);
      binEnt.setLocalScale(binWidth * 0.9, 0.42, 0.22);
      binEnt.addComponent('render', { type: 'box', material: glowMat, castShadows: false, ...layerOpt });
      this.cabinetRoot.addChild(binEnt);

      // Pocket Top Guide Indicator Lamp
      const lampMat = this.createMat({
        diffuse: binColors[i]!,
        emissive: binColors[i]!,
        emissiveIntensity: 0.9,
        gloss: 0.95,
      });
      const lampEnt = new Entity(`BinLamp_${i}`);
      lampEnt.setPosition(bX, binY + 0.26, 0.12);
      lampEnt.setLocalScale(0.12, 0.12, 0.12);
      lampEnt.addComponent('render', { type: 'sphere', material: lampMat, castShadows: false, ...layerOpt });
      this.cabinetRoot.addChild(lampEnt);

      // Pocket Vertical Divider Walls
      if (i < 5) {
        const divEnt = new Entity(`BinDiv_${i}`);
        divEnt.setPosition(bX + binWidth / 2, binY + 0.08, 0.11);
        divEnt.setLocalScale(0.045, 0.54, 0.26);
        divEnt.addComponent('render', { type: 'box', material: frameMat, castShadows: false, ...layerOpt });
        this.cabinetRoot.addChild(divEnt);
      }

      this.bins.push({
        id: `bin_${summonDefs[i]}`,
        summonDefId: summonDefs[i]!,
        tier: binTiers[i]!,
        probability: binProbabilities[i]!,
        index: i,
        minX: bX - binWidth / 2,
        maxX: bX + binWidth / 2,
        centerX: bX,
        entity: binEnt,
        glowMaterial: glowMat,
      });
    }

    // 5. Plunger Chute Entity
    const plungerMat = this.createMat({
      diffuse: '#dc2626',
      emissive: '#b91c1c',
      emissiveIntensity: 0.4,
      gloss: 0.85,
    });
    this.plungerEntity = new Entity('PachinkoPlunger');
    this.plungerEntity.setPosition(1.78, -1.2, 0.15);
    this.plungerEntity.setLocalScale(0.14, 0.38, 0.14);
    this.plungerEntity.addComponent('render', { type: 'cylinder', material: plungerMat, ...layerOpt });
    this.cabinetRoot.addChild(this.plungerEntity);

    // 6. Pre-instantiate Ball Pool (Up to 24 concurrent spheres)
    this.initBallPool(24, layerOpt);
  }

  // Helper for creating tracked standard materials
  private createMat(options: {
    diffuse: string;
    emissive?: string;
    emissiveIntensity?: number;
    gloss?: number;
    opacity?: number;
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
    mat.update();
    this.materials.push(mat);
    return mat;
  }

  private initBallPool(poolSize: number, layerOpt: any): void {
    const ballMat = this.createMat({
      diffuse: '#f8fafc',
      emissive: '#ffffff',
      emissiveIntensity: 0.85,
      gloss: 0.98,
    });

    for (let i = 0; i < poolSize; i++) {
      const ballEnt = new Entity(`PachinkoBall_${i}`);
      ballEnt.setPosition(0, 1.95, 0.12);
      ballEnt.setLocalScale(0.12, 0.12, 0.12);
      ballEnt.addComponent('render', { type: 'sphere', material: ballMat, ...layerOpt });
      ballEnt.enabled = false;
      this.cabinetRoot.addChild(ballEnt);

      this.ballPool.push({
        entity: ballEnt,
        vx: 0,
        vy: 0,
        x: 0,
        y: 1.95,
        targetBinIndex: 0,
        lastHitTime: 0,
        lastBumperHitTime: 0,
        active: false,
      });
    }
  }

  // Compatibility getter for tests referencing single ballEntity
  public get ballEntity(): Entity {
    return this.ballPool[0]?.entity ?? this.cabinetRoot;
  }

  /**
   * Drops a ball destined for targetBinIndex.
   * Supports concurrent multi-ball drops!
   */
  dropBall(targetBinIndex: number = 0, onComplete?: (bin: PachinkoBin) => void): void {
    // Find free ball from pool or reuse oldest
    let ball = this.ballPool.find((b) => !b.active);
    if (!ball) {
      ball = this.ballPool[0]!;
      if (ball.intervalId) {
        clearInterval(ball.intervalId);
      }
    }

    ball.active = true;
    ball.targetBinIndex = targetBinIndex;
    if (onComplete !== undefined) {
      ball.onComplete = onComplete;
    } else {
      delete ball.onComplete;
    }
    ball.lastHitTime = 0;
    ball.lastBumperHitTime = 0;

    const launchX = 1.38;
    const launchY = 1.98;
    ball.x = launchX;
    ball.y = launchY;
    ball.entity.setLocalPosition(launchX, launchY, 0.12);
    ball.entity.enabled = true;

    // Plunger animation
    this.motion.tween({
      id: `plunger_pull_${Date.now()}`,
      from: -1.2,
      to: -1.45,
      duration: DURATION.QUICK,
      easing: EASING.SNAP,
      onUpdate: (y) => this.plungerEntity.setLocalPosition(1.78, y, 0.15),
      onComplete: () => {
        this.audio.playInspectorOpen();
        this.motion.tween({
          id: `plunger_release_${Date.now()}`,
          from: -1.45,
          to: -1.2,
          duration: 0.08,
          easing: EASING.SPRING,
          onUpdate: (y) => this.plungerEntity.setLocalPosition(1.78, y, 0.15),
        });

        // Launch ball over top arch
        const targetLaunchX = (Math.random() - 0.5) * 0.2;
        this.motion.tween({
          id: `ball_launch_${Date.now()}_${Math.random()}`,
          from: launchX,
          to: targetLaunchX,
          duration: 0.28,
          easing: EASING.SNAP,
          onUpdate: (x) => {
            const arcY = launchY + 0.18 * Math.sin((x / launchX) * Math.PI);
            ball!.x = x;
            ball!.y = arcY;
            ball!.entity.setLocalPosition(x, arcY, 0.12);
          },
          onComplete: () => {
            ball!.vx = (Math.random() - 0.5) * 0.9;
            ball!.vy = -1.6;
            this.simulateBallPhysics(ball!);
          },
        });
      },
    });
  }

  private simulateBallPhysics(ball: ActiveBall): void {
    const targetBin = this.bins[ball.targetBinIndex] ?? this.bins[0]!;
    const gravity = -7.2;

    ball.intervalId = setInterval(() => {
      const dt = 0.016;
      ball.vy += gravity * dt;

      // Subtle guide attraction toward designated reward bin
      const biasStrength = Math.max(0, (1.2 - ball.y) / 2.8);
      const toTargetX = targetBin.centerX - ball.x;
      ball.vx += toTargetX * biasStrength * 2.2 * dt;

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      const now = performance.now();

      // 1. Check Shield Bumper collisions
      for (const bumper of this.bumpers) {
        const dx = ball.x - bumper.x;
        const dy = ball.y - bumper.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bumper.radius + 0.06 && now - ball.lastBumperHitTime > 180) {
          ball.lastBumperHitTime = now;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          ball.vx = nx * 2.4 + (Math.random() - 0.5) * 0.5;
          ball.vy = Math.abs(ny) * 2.2;

          // Flash Bumper
          bumper.glowMaterial.emissiveIntensity = 2.8;
          bumper.glowMaterial.update();
          setTimeout(() => {
            bumper.glowMaterial.emissiveIntensity = 0.95;
            bumper.glowMaterial.update();
          }, 140);

          this.audio.playInspectorOpen();
          this.onBumperHit?.(bumper.id);
          break;
        }
      }

      // 2. Check pin collisions
      for (const pin of this.pins) {
        const dx = ball.x - pin.x;
        const dy = ball.y - pin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pin.radius + 0.06 && now - ball.lastHitTime > 50) {
          ball.lastHitTime = now;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          const dot = ball.vx * nx + ball.vy * ny;

          ball.vx = ball.vx - 1.75 * dot * nx + (Math.random() - 0.5) * 0.4;
          ball.vy = (ball.vy - 1.75 * dot * ny) * 0.72;
          this.audio.playInspectorClose();
          break;
        }
      }

      // 3. Walls bounce
      if (ball.x < -1.48) {
        ball.x = -1.48;
        ball.vx = Math.abs(ball.vx) * 0.75;
      } else if (ball.x > 1.48) {
        ball.x = 1.48;
        ball.vx = -Math.abs(ball.vx) * 0.75;
      }

      ball.entity.setLocalPosition(ball.x, ball.y, 0.12);

      // 4. Check Bin Landing
      if (ball.y <= -1.78) {
        clearInterval(ball.intervalId);
        ball.intervalId = undefined;
        ball.active = false;
        ball.entity.enabled = false;

        // Celebratory flash on target bin
        targetBin.glowMaterial.emissiveIntensity = 2.4;
        targetBin.glowMaterial.update();

        this.motion.tween({
          id: `bin_glow_${targetBin.id}_${Date.now()}`,
          from: 2.4,
          to: 0.7,
          duration: DURATION.FOCUS,
          easing: EASING.SNAP,
          onUpdate: (val) => {
            targetBin.glowMaterial.emissiveIntensity = val;
            targetBin.glowMaterial.update();
          },
        });

        this.audio.playInspectorOpen();
        ball.onComplete?.(targetBin);
      }
    }, 16);
  }

  destroy(): void {
    for (const ball of this.ballPool) {
      if (ball.intervalId) clearInterval(ball.intervalId);
    }
    this.ballPool.length = 0;

    for (const mat of this.materials) {
      mat.destroy();
    }
    this.materials.length = 0;
    this.root.destroy();
  }
}
