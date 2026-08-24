import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
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

export class PachinkoWorld {
  public root: Entity;
  public cabinetRoot: Entity;
  public ballEntity: Entity;
  public plungerEntity: Entity;
  public pins: PachinkoPin[] = [];
  public bins: PachinkoBin[] = [];
  public bumpers: PachinkoBumper[] = [];

  private isDropping: boolean = false;
  private ballVelocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
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

    // 1. Cabinet Backboard with 18 deg tilt
    this.cabinetRoot = new Entity('CabinetRoot');
    this.cabinetRoot.setEulerAngles(-18, 0, 0);
    this.cabinetRoot.setPosition(0, 1.8, 0);
    this.root.addChild(this.cabinetRoot);

    const cabinetMat = this.createMat({
      diffuse: '#060b14',
      emissive: '#0b1329',
      emissiveIntensity: 0.25,
      gloss: 0.85,
    });
    const frameMat = this.createMat({
      diffuse: '#d97706',
      emissive: '#f59e0b',
      emissiveIntensity: 0.5,
      gloss: 0.9,
    });
    const pinMat = this.createMat({
      diffuse: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 0.5,
      gloss: 0.95,
    });

    // Board Backplane
    const board = new Entity('PlayfieldBoard');
    board.setPosition(0, 0, 0);
    board.setLocalScale(3.2, 4.4, 0.1);
    board.addComponent('render', { type: 'box', material: cabinetMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(board);

    // Side Framing Borders
    const leftWall = new Entity('LeftWall');
    leftWall.setPosition(-1.62, 0, 0.1);
    leftWall.setLocalScale(0.08, 4.4, 0.25);
    leftWall.addComponent('render', { type: 'box', material: frameMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(leftWall);

    const rightWall = new Entity('RightWall');
    rightWall.setPosition(1.62, 0, 0.1);
    rightWall.setLocalScale(0.08, 4.4, 0.25);
    rightWall.addComponent('render', { type: 'box', material: frameMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(rightWall);

    const topArch = new Entity('TopArch');
    topArch.setPosition(0, 2.22, 0.1);
    topArch.setLocalScale(3.32, 0.08, 0.25);
    topArch.addComponent('render', { type: 'box', material: frameMat, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(topArch);

    // 2. Pins Matrix
    const pinRows = 8;
    const startY = 1.35;
    const rowSpacing = 0.34;
    const pinSpacing = 0.38;

    for (let r = 0; r < pinRows; r++) {
      const pinCount = r % 2 === 0 ? 7 : 6;
      const rowY = startY - r * rowSpacing;
      const offsetX = -((pinCount - 1) * pinSpacing) / 2;

      for (let p = 0; p < pinCount; p++) {
        const pinX = offsetX + p * pinSpacing;
        const pinEnt = new Entity(`Pin_${r}_${p}`);
        pinEnt.setPosition(pinX, rowY, 0.08);
        pinEnt.setEulerAngles(90, 0, 0);
        pinEnt.setLocalScale(0.04, 0.12, 0.04);
        pinEnt.addComponent('render', { type: 'cylinder', material: pinMat, castShadows: false, ...layerOpt });
        this.cabinetRoot.addChild(pinEnt);

        this.pins.push({
          entity: pinEnt,
          x: pinX,
          y: rowY,
          z: 0.08,
          radius: 0.035,
        });
      }
    }

    // 3. Two Side Bounce Bumpers (Charge Shield Meter on collision)
    const bumperMatL = this.createMat({ diffuse: '#0284c7', emissive: '#38bdf8', emissiveIntensity: 0.9, gloss: 0.95 });
    const bumperMatR = this.createMat({ diffuse: '#0284c7', emissive: '#38bdf8', emissiveIntensity: 0.9, gloss: 0.95 });

    const bumperL = new Entity('ShieldBumper_Left');
    bumperL.setPosition(-1.15, -0.4, 0.1);
    bumperL.setLocalScale(0.26, 0.26, 0.26);
    bumperL.addComponent('render', { type: 'sphere', material: bumperMatL, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(bumperL);

    this.bumpers.push({
      id: 'bumper_left',
      x: -1.15,
      y: -0.4,
      radius: 0.15,
      entity: bumperL,
      glowMaterial: bumperMatL,
    });

    const bumperR = new Entity('ShieldBumper_Right');
    bumperR.setPosition(1.15, -0.4, 0.1);
    bumperR.setLocalScale(0.26, 0.26, 0.26);
    bumperR.addComponent('render', { type: 'sphere', material: bumperMatR, castShadows: false, ...layerOpt });
    this.cabinetRoot.addChild(bumperR);

    this.bumpers.push({
      id: 'bumper_right',
      x: 1.15,
      y: -0.4,
      radius: 0.15,
      entity: bumperR,
      glowMaterial: bumperMatR,
    });

    // 4. Six Bottom Bins matching exact probability: [30, 15, 5, 5, 15, 30]
    const summonDefs = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch'];
    const binProbabilities = [30, 15, 5, 5, 15, 30];
    const binTiers = ['F', 'E', 'D', 'D', 'E', 'F'];
    const binColors = ['#f59e0b', '#f97316', '#ef4444', '#22c55e', '#0284c7', '#a855f7'];
    const binWidth = 0.48;
    const binStartX = -((6 * binWidth) / 2) + binWidth / 2;
    const binY = -1.8;

    for (let i = 0; i < 6; i++) {
      const bX = binStartX + i * binWidth;
      const glowMat = this.createMat({
        diffuse: binColors[i]!,
        emissive: binColors[i]!,
        emissiveIntensity: 0.6,
        gloss: 0.8,
      });

      const binEnt = new Entity(`Bin_${summonDefs[i]}`);
      binEnt.setPosition(bX, binY, 0.08);
      binEnt.setLocalScale(binWidth * 0.9, 0.35, 0.2);
      binEnt.addComponent('render', { type: 'box', material: glowMat, castShadows: false, ...layerOpt });
      this.cabinetRoot.addChild(binEnt);

      if (i < 5) {
        const divEnt = new Entity(`BinDiv_${i}`);
        divEnt.setPosition(bX + binWidth / 2, binY + 0.1, 0.08);
        divEnt.setLocalScale(0.04, 0.45, 0.22);
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

    // 5. Metal Ball Entity
    const ballMat = this.createMat({
      diffuse: '#e2e8f0',
      emissive: '#f8fafc',
      emissiveIntensity: 0.7,
      gloss: 0.98,
    });
    this.ballEntity = new Entity('PachinkoBall');
    this.ballEntity.setPosition(0, 1.9, 0.12);
    this.ballEntity.setLocalScale(0.12, 0.12, 0.12);
    this.ballEntity.addComponent('render', { type: 'sphere', material: ballMat, ...layerOpt });
    this.ballEntity.enabled = false;
    this.cabinetRoot.addChild(this.ballEntity);

    // 6. Plunger Entity
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
  }

  private createMat(options: {
    diffuse: string;
    emissive?: string;
    emissiveIntensity?: number;
    gloss?: number;
    opacity?: number;
  }): StandardMaterial {
    const mat = new StandardMaterial();
    mat.diffuse = new Color().fromString(options.diffuse);
    mat.specular = new Color(0, 0, 0);
    if (options.emissive) {
      mat.emissive = new Color().fromString(options.emissive);
      mat.emissiveIntensity = options.emissiveIntensity ?? 0.5;
    }
    if (options.gloss !== undefined) mat.gloss = options.gloss;
    if (options.opacity !== undefined) mat.opacity = options.opacity;
    mat.update();
    this.materials.push(mat);
    return mat;
  }

  dropBall(targetBinIndex: number = 0, onComplete?: (bin: PachinkoBin) => void): void {
    if (this.isDropping) return;
    this.isDropping = true;

    const launchX = 1.35;
    const launchY = 1.95;
    this.ballEntity.setLocalPosition(launchX, launchY, 0.12);
    this.ballEntity.enabled = true;

    this.motion.tween({
      id: 'plunger_pull',
      from: -1.2,
      to: -1.5,
      duration: DURATION.QUICK,
      easing: EASING.SNAP,
      onUpdate: (y) => this.plungerEntity.setLocalPosition(1.78, y, 0.15),
      onComplete: () => {
        this.audio.playInspectorOpen();
        this.motion.tween({
          id: 'plunger_release',
          from: -1.5,
          to: -1.2,
          duration: 0.1,
          easing: EASING.SPRING,
          onUpdate: (y) => this.plungerEntity.setLocalPosition(1.78, y, 0.15),
        });

        this.motion.tween({
          id: 'ball_launch',
          from: launchX,
          to: 0.1 * (Math.random() - 0.5),
          duration: 0.35,
          easing: EASING.SNAP,
          onUpdate: (x) => {
            this.ballEntity.setLocalPosition(x, launchY + 0.15 * Math.sin((x / launchX) * Math.PI), 0.12);
          },
          onComplete: () => {
            this.ballVelocity = {
              x: (Math.random() - 0.5) * 0.8,
              y: -1.5,
              z: 0,
            };
            this.simulateFall(targetBinIndex, onComplete);
          },
        });
      },
    });
  }

  private simulateFall(targetBinIndex: number, onComplete?: (bin: PachinkoBin) => void): void {
    const targetBin = this.bins[targetBinIndex] ?? this.bins[0]!;
    const gravity = -6.8;
    let ballX = this.ballEntity.getLocalPosition().x;
    let ballY = this.ballEntity.getLocalPosition().y;
    let lastHitTime = 0;
    let lastBumperHitTime = 0;

    const interval = setInterval(() => {
      const dt = 0.016;
      this.ballVelocity.y += gravity * dt;

      const biasStrength = Math.max(0, (1.2 - ballY) / 3.0);
      const toTargetX = targetBin.centerX - ballX;
      this.ballVelocity.x += toTargetX * biasStrength * 1.8 * dt;

      ballX += this.ballVelocity.x * dt;
      ballY += this.ballVelocity.y * dt;

      const now = performance.now();

      // Check Shield Bumper collisions
      for (const bumper of this.bumpers) {
        const dx = ballX - bumper.x;
        const dy = ballY - bumper.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bumper.radius + 0.06 && now - lastBumperHitTime > 200) {
          lastBumperHitTime = now;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          this.ballVelocity.x = nx * 2.2 + (Math.random() - 0.5) * 0.4;
          this.ballVelocity.y = Math.abs(ny) * 2.0;

          // Flash Bumper
          bumper.glowMaterial.emissiveIntensity = 2.5;
          bumper.glowMaterial.update();
          setTimeout(() => {
            bumper.glowMaterial.emissiveIntensity = 0.9;
            bumper.glowMaterial.update();
          }, 150);

          this.audio.playInspectorOpen();
          this.onBumperHit?.(bumper.id);
          break;
        }
      }

      // Check pin collisions
      for (const pin of this.pins) {
        const dx = ballX - pin.x;
        const dy = ballY - pin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pin.radius + 0.06 && now - lastHitTime > 60) {
          lastHitTime = now;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          const dot = this.ballVelocity.x * nx + this.ballVelocity.y * ny;

          this.ballVelocity.x = this.ballVelocity.x - 1.7 * dot * nx + (Math.random() - 0.5) * 0.4;
          this.ballVelocity.y = (this.ballVelocity.y - 1.7 * dot * ny) * 0.75;
          this.audio.playInspectorClose();
          break;
        }
      }

      // Walls bounce
      if (ballX < -1.45) {
        ballX = -1.45;
        this.ballVelocity.x = Math.abs(this.ballVelocity.x) * 0.7;
      } else if (ballX > 1.45) {
        ballX = 1.45;
        this.ballVelocity.x = -Math.abs(this.ballVelocity.x) * 0.7;
      }

      this.ballEntity.setLocalPosition(ballX, ballY, 0.12);

      // Check Bin Landing
      if (ballY <= -1.75) {
        clearInterval(interval);
        this.isDropping = false;
        this.ballEntity.enabled = false;

        targetBin.glowMaterial.emissiveIntensity = 2.0;
        targetBin.glowMaterial.update();

        this.motion.tween({
          id: `bin_glow_${targetBin.id}`,
          from: 2.0,
          to: 0.6,
          duration: DURATION.FOCUS,
          easing: EASING.SNAP,
          onUpdate: (val) => {
            targetBin.glowMaterial.emissiveIntensity = val;
            targetBin.glowMaterial.update();
          },
        });

        this.audio.playInspectorOpen();
        onComplete?.(targetBin);
      }
    }, 16);
  }

  destroy(): void {
    for (const mat of this.materials) {
      mat.destroy();
    }
    this.materials.length = 0;
    this.root.destroy();
  }
}
