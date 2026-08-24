import {
  Application,
  Color,
  Entity,
  StandardMaterial,
  type Layer,
} from 'playcanvas';
import type { MotionDirector } from '../presentation/MotionDirector';
import type { AudioDirector } from '../presentation/AudioDirector';
import type { VFXDirector } from '../presentation/VFXDirector';
import type { PresentationEventEmitter } from '../presentation/PresentationEvents';
import {
  createCombatState,
  stepCombat,
  readySkillCommands,
  type CombatState,
} from '@psyblr/combat-core';
import type { CombatSnapshot } from '@psyblr/contracts';
import { EASING } from '../presentation/PresentationTokens';
import { SummonPresenter } from '../summons/SummonPresenter';

export const RAID_ORIGIN = [-40, 0, 0] as const;
export const RAID_CELL_SIZE = 1.0;
export const RAID_SIZE = 8;

export class RaidWorld {
  public root: Entity;
  public arenaFloor: Entity;
  public unitEntities: Map<string, Entity> = new Map();
  public healthBars: Map<string, { root: Entity; fill: Entity; maxHp: number }> = new Map();
  public unitPresenters: Map<string, SummonPresenter> = new Map();

  private combatState: CombatState | null = null;
  private isCombatRunning: boolean = false;
  private materials: StandardMaterial[] = [];

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private audio: AudioDirector,
    private vfx: VFXDirector,
    private events: PresentationEventEmitter,
    private worldLayer?: Layer
  ) {
    const layerOpt = this.worldLayer ? { layers: [this.worldLayer.id] } : {};

    this.root = new Entity('Raid_World_Root');
    this.root.setPosition(RAID_ORIGIN[0], RAID_ORIGIN[1], RAID_ORIGIN[2]);
    this.root.enabled = false;
    this.app.root.addChild(this.root);

    // 1. 8x8 Tactical Raid Arena Floor (Dark Crimson Slate)
    const floorMat = this.createMat({
      diffuse: '#180a0a',
      emissive: '#2b0c0c',
      emissiveIntensity: 0.35,
      gloss: 0,
    });
    this.arenaFloor = new Entity('RaidArenaFloor');
    this.arenaFloor.setLocalPosition(0, 0.02, 0);
    this.arenaFloor.setLocalScale(RAID_SIZE * RAID_CELL_SIZE + 0.4, 0.04, RAID_SIZE * RAID_CELL_SIZE + 0.4);
    this.arenaFloor.addComponent('render', { type: 'box', material: floorMat, castShadows: false, ...layerOpt });
    this.root.addChild(this.arenaFloor);

    // Arena Gold/Crimson Rim
    const rimMat = this.createMat({
      diffuse: '#991b1b',
      emissive: '#ef4444',
      emissiveIntensity: 0.6,
      gloss: 0,
    });
    const rim = new Entity('RaidArenaRim');
    rim.setLocalPosition(0, 0.03, 0);
    rim.setLocalScale(RAID_SIZE * RAID_CELL_SIZE + 0.48, 0.02, RAID_SIZE * RAID_CELL_SIZE + 0.48);
    rim.addComponent('render', { type: 'box', material: rimMat, castShadows: false, ...layerOpt });
    this.root.addChild(rim);

    // Zone Dividing Line (Player z>=4 vs Enemy z<4)
    const lineMat = this.createMat({
      diffuse: '#ef4444',
      emissive: '#f87171',
      emissiveIntensity: 1.0,
      gloss: 0,
    });
    const midLine = new Entity('RaidMidLine');
    midLine.setLocalPosition(0, 0.045, 0);
    midLine.setLocalScale(RAID_SIZE * RAID_CELL_SIZE, 0.015, 0.06);
    midLine.addComponent('render', { type: 'box', material: lineMat, castShadows: false, ...layerOpt });
    this.root.addChild(midLine);

    // Grid Cell Dots
    const cellDotMat = this.createMat({
      diffuse: '#f87171',
      emissive: '#ef4444',
      emissiveIntensity: 0.5,
      gloss: 0,
    });
    for (let x = 0; x < RAID_SIZE; x++) {
      for (let z = 0; z < RAID_SIZE; z++) {
        const dot = new Entity(`RaidDot_${x}_${z}`);
        const lx = (x - (RAID_SIZE - 1) / 2) * RAID_CELL_SIZE;
        const lz = (z - (RAID_SIZE - 1) / 2) * RAID_CELL_SIZE;
        dot.setLocalPosition(lx, 0.045, lz);
        dot.setLocalScale(0.04, 0.01, 0.04);
        dot.addComponent('render', { type: 'box', material: cellDotMat, castShadows: false, ...layerOpt });
        this.root.addChild(dot);
      }
    }
  }

  show(): void {
    this.root.enabled = true;
  }

  hide(): void {
    this.root.enabled = false;
    this.clearUnits();
  }

  private createMat(options: {
    diffuse: string;
    emissive?: string;
    emissiveIntensity?: number;
    gloss?: number;
  }): StandardMaterial {
    const mat = new StandardMaterial();
    mat.diffuse = new Color().fromString(options.diffuse);
    mat.specular = new Color(0, 0, 0);
    if (options.emissive) {
      mat.emissive = new Color().fromString(options.emissive);
      mat.emissiveIntensity = options.emissiveIntensity ?? 0.5;
    }
    if (options.gloss !== undefined) mat.gloss = options.gloss;
    mat.update();
    this.materials.push(mat);
    return mat;
  }

  cellToLocal(gridX: number, gridZ: number): [number, number, number] {
    const halfSpan = (RAID_SIZE - 1) / 2;
    return [
      (gridX - halfSpan) * RAID_CELL_SIZE,
      0.05,
      (gridZ - halfSpan) * RAID_CELL_SIZE,
    ];
  }

  loadRoundUnits(snapshot: CombatSnapshot): void {
    this.clearUnits();

    for (const unit of snapshot.units) {
      const isPlayer = unit.side === 'player';
      const unitRoot = new Entity(`RaidUnit_${unit.id}`);
      const lpos = this.cellToLocal(unit.spawnCell.x, unit.spawnCell.z);
      unitRoot.setLocalPosition(lpos[0], lpos[1], lpos[2]);
      if (!isPlayer) {
        unitRoot.setLocalEulerAngles(0, 180, 0);
      }
      this.root.addChild(unitRoot);

      const presenter = new SummonPresenter(this.worldLayer);
      presenter.createVisuals(unit.definitionId, unitRoot);
      this.unitPresenters.set(unit.id, presenter);
      this.unitEntities.set(unit.id, unitRoot);

      // Floating Health Bar
      this.createFloatingHealthBar(unit.id, unitRoot, unit.hp, isPlayer);
    }
  }

  private createFloatingHealthBar(unitId: string, parent: Entity, maxHp: number, isPlayer: boolean): void {
    const layerOpt = this.worldLayer ? { layers: [this.worldLayer.id] } : {};
    const barRoot = new Entity(`RaidHpBar_${unitId}`);
    barRoot.setLocalPosition(0, 1.4, 0);
    parent.addChild(barRoot);

    const bgMat = this.createMat({ diffuse: '#0f172a', emissive: '#000000', gloss: 0 });
    const bg = new Entity('HpBg');
    bg.setLocalScale(0.6, 0.06, 0.04);
    bg.addComponent('render', { type: 'box', material: bgMat, castShadows: false, ...layerOpt });
    barRoot.addChild(bg);

    const fillMat = this.createMat({
      diffuse: isPlayer ? '#22c55e' : '#ef4444',
      emissive: isPlayer ? '#4ade80' : '#f87171',
      emissiveIntensity: 0.8,
      gloss: 0.9,
    });
    const fill = new Entity('HpFill');
    fill.setLocalPosition(0, 0, 0.01);
    fill.setLocalScale(0.58, 0.05, 0.04);
    fill.addComponent('render', { type: 'box', material: fillMat, castShadows: false, ...layerOpt });
    barRoot.addChild(fill);

    this.healthBars.set(unitId, { root: barRoot, fill, maxHp });
  }

  startCombat(snapshot: CombatSnapshot, onRoundEnded?: (winner: string) => void): void {
    if (this.isCombatRunning) return;
    this.isCombatRunning = true;

    this.combatState = createCombatState(snapshot, Math.floor(Math.random() * 10000));

    const stepInterval = setInterval(() => {
      if (!this.combatState || this.combatState.ended) {
        clearInterval(stepInterval);
        this.isCombatRunning = false;
        const winner = this.combatState?.winner ?? 'player';
        this.audio.playInspectorOpen();
        onRoundEnded?.(winner);
        return;
      }

      const commands = readySkillCommands(this.combatState);
      const stepResult = stepCombat(this.combatState, commands);

      for (const event of stepResult.events) {
        if (event.type === 'move' && event.actorId) {
          const unit = this.unitEntities.get(event.actorId);
          if (unit && event.payload.x !== undefined && event.payload.z !== undefined) {
            const gx = (event.payload.x as number) / 1000;
            const gz = (event.payload.z as number) / 1000;
            const lpos = this.cellToLocal(gx, gz);

            this.motion.tween({
              id: `raid_move_${event.actorId}`,
              from: 0,
              to: 1,
              duration: 0.1,
              easing: EASING.LINEAR,
              onUpdate: (t) => {
                const cur = unit.getLocalPosition();
                unit.setLocalPosition(cur.x + (lpos[0] - cur.x) * t, lpos[1], cur.z + (lpos[2] - cur.z) * t);
              },
            });
          }
        } else if (event.type === 'damage' && event.targetId) {
          const target = this.unitEntities.get(event.targetId);
          if (target) {
            const tpos = target.getPosition();
            this.vfx.spawnBurst([tpos.x, tpos.y + 0.4, tpos.z], '#ef4444');

            const bar = this.healthBars.get(event.targetId);
            const remainingHp = (event.payload.remainingHp as number) ?? 0;
            if (bar) {
              const pct = Math.max(0, Math.min(1, remainingHp / bar.maxHp));
              bar.fill.setLocalScale(0.58 * pct, 0.05, 0.04);
            }
          }
        } else if (event.type === 'death' && event.actorId) {
          const target = this.unitEntities.get(event.actorId);
          if (target) {
            const tpos = target.getPosition();
            this.vfx.spawnBurst([tpos.x, tpos.y + 0.2, tpos.z], '#64748b');
            target.enabled = false;
          }
        } else if (event.type === 'skill_cast' && event.actorId) {
          const actor = this.unitEntities.get(event.actorId);
          if (actor) {
            const apos = actor.getPosition();
            this.vfx.spawnBurst([apos.x, apos.y + 0.5, apos.z], '#f59e0b');
          }
        }
      }
    }, 100);
  }

  clearUnits(): void {
    for (const [, unit] of this.unitEntities) {
      unit.destroy();
    }
    this.unitEntities.clear();
    this.healthBars.clear();

    for (const [, pres] of this.unitPresenters) {
      pres.destroy();
    }
    this.unitPresenters.clear();
  }

  destroy(): void {
    this.clearUnits();
    for (const mat of this.materials) {
      mat.destroy();
    }
    this.materials.length = 0;
    this.root.destroy();
  }
}
