import type { Application, Layer } from 'playcanvas';
import type { CampCell, CampPlacement, SummonInstance } from '@psyblr/contracts';
import { BaseWorld } from '../world/BaseWorld';
import { SummonEntity } from '../summons/SummonEntity';
import type { MotionDirector } from '../presentation/MotionDirector';
import { moveCampSummon } from '@psyblr/game-rules';

export class SceneManager {
  public baseWorld: BaseWorld;
  public summons: SummonEntity[] = [];
  private placements: CampPlacement[] = [];

  constructor(
    private app: Application,
    private motion: MotionDirector,
    private worldLayer?: Layer
  ) {
    this.baseWorld = new BaseWorld(this.app, this.worldLayer);
    this.spawnGoldenSummon();
  }

  private spawnGoldenSummon(): void {
    const starterGoku: SummonInstance = {
      id: 'starter:goku:001',
      definitionId: 'goku',
      tier: 'F',
    };

    const initialCell: CampCell = { x: 2, y: 3 };

    const gokuEntity = new SummonEntity(
      this.app,
      this.motion,
      starterGoku,
      initialCell,
      this.worldLayer
    );

    this.summons.push(gokuEntity);
    this.placements.push({
      summonInstanceId: starterGoku.id,
      cell: initialCell,
    });
  }

  getPlacements(): readonly CampPlacement[] {
    return this.placements;
  }

  onSummonPlacementCommitted(summon: SummonEntity, toCell: CampCell): void {
    this.placements = moveCampSummon(summon.instance.id, toCell, this.placements);
  }

  update(dt: number): void {
    for (const summon of this.summons) {
      summon.update(dt);
    }
  }

  destroy(): void {
    for (const summon of this.summons) {
      summon.destroy();
    }
    this.summons.length = 0;
    this.baseWorld.destroy();
  }
}
