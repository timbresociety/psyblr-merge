import type {
  CampPlacement,
  ReleaseBallResult,
  SpawnDailyPoolSlot,
  SummonInstance,
} from '@psyblr/contracts';
import { findFirstExposedCampCell, isCampCellOccupied } from '@psyblr/game-rules';

export class SpawnAuthorityService {
  private balls: number = 10;
  private maxBalls: number = 10;

  // Curated 6-Summon Starter Daily Pool
  private dailyPool: SpawnDailyPoolSlot[] = [
    { slotIndex: 0, summonDefinitionId: 'goku', probability: 0.16 },
    { slotIndex: 1, summonDefinitionId: 'naruto', probability: 0.16 },
    { slotIndex: 2, summonDefinitionId: 'luffy', probability: 0.16 },
    { slotIndex: 3, summonDefinitionId: 'eren', probability: 0.16 },
    { slotIndex: 4, summonDefinitionId: 'l', probability: 0.18 },
    { slotIndex: 5, summonDefinitionId: 'lelouch', probability: 0.18 },
  ];

  getBallsRemaining(): number {
    return this.balls;
  }

  getDailyPool(): readonly SpawnDailyPoolSlot[] {
    return this.dailyPool;
  }

  /**
   * Authoritative spawn resolution.
   * Resolves reward and destination cell before presentation animation begins.
   */
  async requestReleaseBall(
    currentPlacements: readonly CampPlacement[],
    clientActionId?: string
  ): Promise<ReleaseBallResult> {
    const actionId = clientActionId ?? `action_spawn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Select reward slot based on cumulative probability distribution
    const rand = Math.random();
    let cumulative = 0;
    let selectedSlot = this.dailyPool[0]!;

    for (const slot of this.dailyPool) {
      cumulative += slot.probability;
      if (rand <= cumulative) {
        selectedSlot = slot;
        break;
      }
    }

    const createdSummon: SummonInstance = {
      id: `spawn:${selectedSlot.summonDefinitionId}:${Date.now()}`,
      definitionId: selectedSlot.summonDefinitionId,
      tier: 'F',
    };

    // Find destination cell in Camp
    let destCell = findFirstExposedCampCell(currentPlacements);
    if (!destCell) {
      // If full or default, pick first unoccupied cell
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 6; x++) {
          if (!isCampCellOccupied({ x, y }, currentPlacements)) {
            destCell = { x, y };
            break;
          }
        }
        if (destCell) break;
      }
    }

    // Fallback if camp is completely packed (6x6 = 36 summons)
    const finalCell = destCell ?? { x: 0, y: 1 };

    this.balls = Math.max(0, this.balls - 1);

    const result: ReleaseBallResult = {
      clientActionId: actionId,
      rewardSlot: selectedSlot.slotIndex,
      createdSummon,
      destination: {
        summonInstanceId: createdSummon.id,
        cell: finalCell,
      },
      ballsRemaining: this.balls,
      blobProgress: {},
      replay: {
        replayId: `replay_${actionId}`,
        rewardSlot: selectedSlot.slotIndex,
        presentationSeed: `seed_${Date.now()}`,
      },
    };

    return result;
  }
}
