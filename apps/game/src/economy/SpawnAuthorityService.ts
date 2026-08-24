import type {
  CampPlacement,
  ReleaseBallResult,
  SpawnDailyPoolSlot,
  SummonInstance,
  Tier,
} from '@psyblr/contracts';
import { findFirstExposedCampCell, isCampCellOccupied } from '@psyblr/game-rules';

export class SpawnAuthorityService {
  private balls: number = 100;
  private lastDealerClaimTime: number = 0;
  private shieldCharges: number = 0;
  private shieldExpiresAt: number = 0; // Timestamp ms

  // Curated 6-Summon Daily Pool with exact specified probabilities: [30, 15, 5, 5, 15, 30]
  private dailyPool: (SpawnDailyPoolSlot & { tier: Tier })[] = [
    { slotIndex: 0, summonDefinitionId: 'goku', probability: 0.30, tier: 'F' },
    { slotIndex: 1, summonDefinitionId: 'naruto', probability: 0.15, tier: 'E' },
    { slotIndex: 2, summonDefinitionId: 'luffy', probability: 0.05, tier: 'D' },
    { slotIndex: 3, summonDefinitionId: 'eren', probability: 0.05, tier: 'D' },
    { slotIndex: 4, summonDefinitionId: 'l', probability: 0.15, tier: 'E' },
    { slotIndex: 5, summonDefinitionId: 'lelouch', probability: 0.30, tier: 'F' },
  ];

  constructor() {
    this.loadPersistedState();
  }

  private loadPersistedState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedBalls = localStorage.getItem('psyblr_balls');
        if (savedBalls !== null) this.balls = parseInt(savedBalls, 10);

        const savedClaim = localStorage.getItem('psyblr_last_dealer_claim');
        if (savedClaim !== null) this.lastDealerClaimTime = parseInt(savedClaim, 10);

        const savedShield = localStorage.getItem('psyblr_shield_expires');
        if (savedShield !== null) this.shieldExpiresAt = parseInt(savedShield, 10);
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('psyblr_balls', this.balls.toString());
        localStorage.setItem('psyblr_last_dealer_claim', this.lastDealerClaimTime.toString());
        localStorage.setItem('psyblr_shield_expires', this.shieldExpiresAt.toString());
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  getBallsRemaining(): number {
    return this.balls;
  }

  addBalls(count: number): void {
    this.balls += count;
    this.saveState();
  }

  // --- DEALER 24-HOUR GENERATION (100 BALLS) ---
  canClaimDailyDealer(): boolean {
    const elapsed = Date.now() - this.lastDealerClaimTime;
    return elapsed >= 24 * 60 * 60 * 1000;
  }

  getTimeUntilNextDealerClaimMs(): number {
    const elapsed = Date.now() - this.lastDealerClaimTime;
    const remaining = 24 * 60 * 60 * 1000 - elapsed;
    return Math.max(0, remaining);
  }

  claimDailyDealerBalls(): { success: boolean; ballsGranted: number; nextClaimMs: number } {
    if (!this.canClaimDailyDealer() && this.lastDealerClaimTime > 0) {
      return { success: false, ballsGranted: 0, nextClaimMs: this.getTimeUntilNextDealerClaimMs() };
    }
    this.balls += 100;
    this.lastDealerClaimTime = Date.now();
    this.saveState();
    return { success: true, ballsGranted: 100, nextClaimMs: 24 * 60 * 60 * 1000 };
  }

  // --- SHIELD BUMPER BOUNCE CHARGES & 1-HOUR ACTIVE SHIELD ---
  addBumperBounceCharge(): { currentCharges: number; shieldGranted: boolean; shieldExpiresAt: number } {
    this.shieldCharges++;
    let shieldGranted = false;

    if (this.shieldCharges >= 5) {
      this.shieldCharges = 0;
      shieldGranted = true;
      // Grant 1 Hour Shield
      const now = Date.now();
      const currentExpiry = Math.max(now, this.shieldExpiresAt);
      this.shieldExpiresAt = currentExpiry + 60 * 60 * 1000; // +1 hour
      this.saveState();
    }

    return {
      currentCharges: this.shieldCharges,
      shieldGranted,
      shieldExpiresAt: this.shieldExpiresAt,
    };
  }

  getShieldCharges(): number {
    return this.shieldCharges;
  }

  isShieldActive(): boolean {
    return Date.now() < this.shieldExpiresAt;
  }

  getShieldRemainingTimeMs(): number {
    return Math.max(0, this.shieldExpiresAt - Date.now());
  }

  getDailyPool(): readonly (SpawnDailyPoolSlot & { tier: Tier })[] {
    return this.dailyPool;
  }

  /**
   * Authoritative spawn resolution for Pachinko machine.
   */
  async requestReleaseBall(
    currentPlacements: readonly CampPlacement[],
    clientActionId?: string
  ): Promise<ReleaseBallResult> {
    const actionId = clientActionId ?? `action_spawn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Try server-authoritative local DB endpoint first if available
    try {
      const response = await fetch('http://127.0.0.1:54321/api/economy/release-ball', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientActionId: actionId, currentPlacements }),
      });
      if (response.ok) {
        const serverResult = (await response.json()) as ReleaseBallResult;
        if (serverResult && serverResult.createdSummon) {
          this.balls = serverResult.ballsRemaining;
          this.saveState();
          return serverResult;
        }
      }
    } catch {
      // Local DB offline, fallback to standalone simulation
    }

    // Select reward slot based on probability distribution [30, 15, 5, 5, 15, 30]
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
      tier: selectedSlot.tier,
    };

    // Find destination cell in Camp (Rows 1-5 first, then Row 0)
    let destCell = findFirstExposedCampCell(currentPlacements);
    if (!destCell) {
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

    const finalCell = destCell ?? { x: 0, y: 1 };
    this.balls = Math.max(0, this.balls - 1);
    this.saveState();

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

  async resetLocalDb(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:54321/api/player/reset', { method: 'POST' });
      if (response.ok) {
        this.balls = 100;
        this.saveState();
        return true;
      }
    } catch {
      this.balls = 100;
      this.saveState();
    }
    return false;
  }

  async seedMergeTest(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:54321/api/player/seed-tier-test', { method: 'POST' });
      return response.ok;
    } catch {
      return false;
    }
  }
}
