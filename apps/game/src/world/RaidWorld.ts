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
  type CombatUnitState,
} from '@psyblr/combat-core';
import type { CombatSnapshot } from '@psyblr/contracts';
import { getSummonDefinition } from '@psyblr/game-content';
import { resolveTierStats } from '@psyblr/game-rules';
import { DURATION, EASING } from '../presentation/PresentationTokens';
import { SummonPresenter } from '../summons/SummonPresenter';

export const RAID_ORIGIN = [-6.4, 0, 0] as const;
export const RAID_CELL_SIZE = 0.9;
export const RAID_SIZE = 8;

export class RaidWorld {
  public root: Entity;
  public arenaFloor: Entity;
  public unitEntities: Map<string, Entity> = new Map();
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
    this.app.root.addChild(this.root);

    // 1. 8x8 Battlefield Floor Plinth
    const floorMat = this.createMat({
      diffuse: '#090d16',
      emissive: '#0f172a',
      emissiveIntensity: 0.25,
      gloss: 0.7,
    });
    this.arenaFloor = new Entity('RaidArenaFloor');
    this.arenaFloor.setPosition(0, 0.02, 0);
    this.arenaFloor.setLocalScale(RAID_SIZE * RAID_CELL_SIZE, 0.04, RAID_SIZE * RAID_CELL_SIZE);
    this.arenaFloor.addComponent('render', { type: 'box', material: floorMat, ...layerOpt });
    this.root.addChild(this.arenaFloor);

    // 2. Zone Dividing Line (Player z>=4 vs Enemy z<4)
    const lineMat = this.createMat({
      diffuse: '#ef4444',
      emissive: '#ef4444',
      emissiveIntensity: 1.2,
      gloss: 0.9,
    });
    const midLine = new Entity('RaidMidLine');
    midLine.setPosition(0, 0.045, 0);
    midLine.setLocalScale(RAID_SIZE * RAID_CELL_SIZE, 0.01, 0.05);
    midLine.addComponent('render', { type: 'box', material: lineMat, ...layerOpt });
    this.root.addChild(midLine);

    // 3. Grid Cell Markers
    const cellDotMat = this.createMat({
      diffuse: '#475569',
      emissive: '#64748b',
      emissiveIntensity: 0.3,
      gloss: 0.5,
    });
    for (let x = 0; x < RAID_SIZE; x++) {
      for (let z = 0; z < RAID_SIZE; z++) {
        const dot = new Entity(`RaidDot_${x}_${z}`);
        const wx = (x - (RAID_SIZE - 1) / 2) * RAID_CELL_SIZE;
        const wz = (z - (RAID_SIZE - 1) / 2) * RAID_CELL_SIZE;
        dot.setPosition(wx, 0.045, wz);
        dot.setLocalScale(0.04, 0.01, 0.04);
        dot.addComponent('render', { type: 'box', material: cellDotMat, ...layerOpt });
        this.root.addChild(dot);
      }
    }
  }

  private createMat(options: {
    diffuse: string;
    emissive?: string;
    emissiveIntensity?: number;
    gloss?: number;
  }): StandardMaterial {
    const mat = new StandardMaterial();
    mat.diffuse = new Color().fromString(options.diffuse);
    if (options.emissive) {
      mat.emissive = new Color().fromString(options.emissive);
      mat.emissiveIntensity = options.emissiveIntensity ?? 0.5;
    }
    if (options.gloss !== undefined) mat.gloss = options.gloss;
    mat.update();
    this.materials.push(mat);
    return mat;
  }

  cellToWorld(gridX: number, gridZ: number): [number, number, number] {
    const halfSpan = (RAID_SIZE - 1) / 2;
    return [
      RAID_ORIGIN[0] + (gridX - halfSpan) * RAID_CELL_SIZE,
      0.05,
      RAID_ORIGIN[2] + (gridZ - halfSpan) * RAID_CELL_SIZE,
    ];
  }

  /**
   * Initializes 2v2 preparation team snapshot.
   */
  prepare2v2Match(): CombatSnapshot {
    this.clearUnits();

    const gokuDef = getSummonDefinition('goku');
    const narutoDef = getSummonDefinition('naruto');
    const erenDef = getSummonDefinition('eren');
    const luffyDef = getSummonDefinition('luffy');

    const gokuStats = resolveTierStats(gokuDef.stats, 'E');
    const narutoStats = resolveTierStats(narutoDef.stats, 'F');
    const erenStats = resolveTierStats(erenDef.stats, 'F');
    const luffyStats = resolveTierStats(luffyDef.stats, 'F');

    const snapshot: CombatSnapshot = {
      battleId: `raid_2v2_${Date.now()}`,
      mode: 'raid',
      units: [
        // Player Team (z >= 4)
        {
          id: 'player:goku:01',
          definitionId: 'goku',
          side: 'player',
          spawnCell: { x: 3, z: 5 },
          hp: gokuStats.hp,
          atk: gokuStats.atk,
          def: gokuStats.def,
          attacksPerSecond: gokuStats.attacksPerSecond,
          range: gokuStats.range,
          moveSpeed: gokuStats.moveSpeed,
          basicAttackDamagePct: 0,
          skillPowerPct: 0,
          statusDurationPct: 0,
          skill1Id: gokuDef.skills.skill1,
          skill1: {
            kind: 'line_damage',
            cooldownMs: 4000,
            initialDelayMs: 2000,
            damageMultiplier: 2.2,
            radius: 1.5,
            presentationKey: 'kamehameha',
          },
        },
        {
          id: 'player:naruto:02',
          definitionId: 'naruto',
          side: 'player',
          spawnCell: { x: 4, z: 5 },
          hp: narutoStats.hp,
          atk: narutoStats.atk,
          def: narutoStats.def,
          attacksPerSecond: narutoStats.attacksPerSecond,
          range: narutoStats.range,
          moveSpeed: narutoStats.moveSpeed,
          basicAttackDamagePct: 0,
          skillPowerPct: 0,
          statusDurationPct: 0,
          skill1Id: narutoDef.skills.skill1,
          skill1: {
            kind: 'aoe_slow',
            cooldownMs: 3500,
            initialDelayMs: 1500,
            damageMultiplier: 1.8,
            radius: 2.0,
            durationMs: 2000,
            slowPercent: 35,
            presentationKey: 'rasengan',
          },
        },
        // Enemy Team (z < 4)
        {
          id: 'enemy:eren:01',
          definitionId: 'eren',
          side: 'enemy',
          spawnCell: { x: 3, z: 2 },
          hp: erenStats.hp,
          atk: erenStats.atk,
          def: erenStats.def,
          attacksPerSecond: erenStats.attacksPerSecond,
          range: erenStats.range,
          moveSpeed: erenStats.moveSpeed,
          basicAttackDamagePct: 0,
          skillPowerPct: 0,
          statusDurationPct: 0,
          skill1Id: erenDef.skills.skill1,
          skill1: {
            kind: 'dash_aoe',
            cooldownMs: 4500,
            initialDelayMs: 2200,
            damageMultiplier: 2.0,
            radius: 1.8,
            dashDistance: 2.5,
            presentationKey: 'titan_shift',
          },
        },
        {
          id: 'enemy:luffy:02',
          definitionId: 'luffy',
          side: 'enemy',
          spawnCell: { x: 4, z: 2 },
          hp: luffyStats.hp,
          atk: luffyStats.atk,
          def: luffyStats.def,
          attacksPerSecond: luffyStats.attacksPerSecond,
          range: luffyStats.range,
          moveSpeed: luffyStats.moveSpeed,
          basicAttackDamagePct: 0,
          skillPowerPct: 0,
          statusDurationPct: 0,
          skill1Id: luffyDef.skills.skill1,
          skill1: {
            kind: 'line_damage',
            cooldownMs: 3800,
            initialDelayMs: 1800,
            damageMultiplier: 1.9,
            radius: 1.4,
            presentationKey: 'gum_gum_pistol',
          },
        },
      ],
    };

    // Render initial 3D units in Arena
    for (const unit of snapshot.units) {
      this.spawnRaidUnitVisual(unit.id, unit.definitionId, unit.spawnCell.x, unit.spawnCell.z, unit.side);
    }

    return snapshot;
  }

  private spawnRaidUnitVisual(
    id: string,
    defId: string,
    cellX: number,
    cellZ: number,
    side: 'player' | 'enemy'
  ): Entity {
    const unitRoot = new Entity(`RaidUnit_${id}`);
    const worldPos = this.cellToWorld(cellX, cellZ);
    unitRoot.setPosition(worldPos[0], worldPos[1], worldPos[2]);
    if (side === 'enemy') {
      unitRoot.setEulerAngles(0, 180, 0); // Face player
    }
    this.app.root.addChild(unitRoot);

    const presenter = new SummonPresenter(this.worldLayer);
    presenter.createVisuals(defId, unitRoot);

    this.unitEntities.set(id, unitRoot);
    this.unitPresenters.set(id, presenter);
    return unitRoot;
  }

  /**
   * Runs the deterministic combat simulation step-by-step with 3D visuals.
   */
  startCombat(snapshot: CombatSnapshot, onBattleEnded?: (winner: string) => void): void {
    if (this.isCombatRunning) return;
    this.isCombatRunning = true;

    this.combatState = createCombatState(snapshot, 42);

    const stepInterval = setInterval(() => {
      if (!this.combatState || this.combatState.ended) {
        clearInterval(stepInterval);
        this.isCombatRunning = false;
        const winner = this.combatState?.winner ?? 'player';
        this.audio.playInspectorOpen();
        onBattleEnded?.(winner);
        return;
      }

      // Step simulation by 100ms
      const commands = readySkillCommands(this.combatState);
      const stepResult = stepCombat(this.combatState, commands);

      // Process and render visual events for this tick
      for (const event of stepResult.events) {
        if (event.type === 'move' && event.actorId) {
          const unit = this.unitEntities.get(event.actorId);
          if (unit && event.payload.x !== undefined && event.payload.z !== undefined) {
            const gx = (event.payload.x as number) / 1000;
            const gz = (event.payload.z as number) / 1000;
            const wpos = this.cellToWorld(gx, gz);

            this.motion.tween({
              id: `raid_unit_move_${event.actorId}`,
              from: 0,
              to: 1,
              duration: 0.1,
              easing: EASING.LINEAR,
              onUpdate: (t) => {
                const cur = unit.getPosition();
                unit.setPosition(
                  cur.x + (wpos[0] - cur.x) * t,
                  wpos[1],
                  cur.z + (wpos[2] - cur.z) * t
                );
              },
            });
          }
        } else if (event.type === 'damage' && event.targetId) {
          const target = this.unitEntities.get(event.targetId);
          if (target) {
            const tpos = target.getPosition();
            this.vfx.spawnBurst([tpos.x, tpos.y + 0.3, tpos.z], '#ef4444');
          }
        } else if (event.type === 'death' && event.actorId) {
          const target = this.unitEntities.get(event.actorId);
          if (target) {
            const tpos = target.getPosition();
            this.vfx.spawnBurst([tpos.x, tpos.y, tpos.z], '#64748b');
            target.enabled = false;
          }
        } else if (event.type === 'skill_cast' && event.actorId) {
          const actor = this.unitEntities.get(event.actorId);
          if (actor) {
            const apos = actor.getPosition();
            this.vfx.spawnBurst([apos.x, apos.y + 0.4, apos.z], '#f59e0b');
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
