import type {
  CampPlacement,
  ReleaseBallResult,
  SpawnDailyPoolSlot,
  SummonInstance,
  Tier,
} from '@psyblr/contracts';
import { CAMP_CAPACITY, findFirstExposedCampCell, isCampCellOccupied } from '@psyblr/game-rules';

const DEALER_REFILL_TARGET = 100;
const DEALER_REFILL_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const SHIELD_GRANT_MS = 60 * 60 * 1000;
const SHIELD_MAX_MS = 8 * 60 * 60 * 1000;

type SpawnAuthorityOptions = {
  allowDevelopmentFallback?: boolean;
};

function defaultDevelopmentFallback(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

export class SpawnAuthorityService {
  private balls: number = DEALER_REFILL_TARGET;
  private lastDealerClaimTime: number = 0;
  private shieldCharges: number = 0;
  private shieldExpiresAt: number = 0;
  private readonly allowDevelopmentFallback: boolean;

  // Development placeholder for the server-provided global daily pool.
  // All six bins are F tier. Production identities and outcome come from authority.
  private dailyPool: (SpawnDailyPoolSlot & { tier: Tier })[] = [
    { slotIndex: 0, summonDefinitionId: 'goku', probability: 0.10, tier: 'F' },
    { slotIndex: 1, summonDefinitionId: 'naruto', probability: 0.15, tier: 'F' },
    { slotIndex: 2, summonDefinitionId: 'luffy', probability: 0.25, tier: 'F' },
    { slotIndex: 3, summonDefinitionId: 'eren', probability: 0.25, tier: 'F' },
    { slotIndex: 4, summonDefinitionId: 'l', probability: 0.15, tier: 'F' },
    { slotIndex: 5, summonDefinitionId: 'lelouch', probability: 0.10, tier: 'F' },
  ];

  constructor(options: SpawnAuthorityOptions = {}) {
    this.allowDevelopmentFallback = options.allowDevelopmentFallback ?? defaultDevelopmentFallback();
    this.loadPersistedState();
  }

  private loadPersistedState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedBalls = localStorage.getItem('psyblr_balls');
        if (savedBalls !== null) this.balls = Math.max(0, parseInt(savedBalls, 10));

        const savedClaim = localStorage.getItem('psyblr_last_dealer_claim');
        if (savedClaim !== null) this.lastDealerClaimTime = parseInt(savedClaim, 10);

        const savedShield = localStorage.getItem('psyblr_shield_expires');
        if (savedShield !== null) this.shieldExpiresAt = parseInt(savedShield, 10);
      }
    } catch {
      // Persistence is a development convenience only. Server state is canonical.
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
      // Ignore development storage failures.
    }
  }

  getBallsRemaining(): number {
    return this.balls;
  }

  addBalls(count: number): void {
    this.balls = Math.max(0, this.balls + count);
    this.saveState();
  }

  // --- DEALER: REFILL TO 100 AFTER A 2-HOUR COOLDOWN ---
  canClaimDailyDealer(): boolean {
    if (this.balls >= DEALER_REFILL_TARGET) return false;
    if (this.lastDealerClaimTime === 0) return true;
    return Date.now() - this.lastDealerClaimTime >= DEALER_REFILL_COOLDOWN_MS;
  }

  getTimeUntilNextDealerClaimMs(): number {
    if (this.lastDealerClaimTime === 0) return 0;
    const elapsed = Date.now() - this.lastDealerClaimTime;
    return Math.max(0, DEALER_REFILL_COOLDOWN_MS - elapsed);
  }

  claimDailyDealerBalls(): { success: boolean; ballsGranted: number; nextClaimMs: number } {
    if (!this.canClaimDailyDealer()) {
      return { success: false, ballsGranted: 0, nextClaimMs: this.getTimeUntilNextDealerClaimMs() };
    }

    const ballsGranted = DEALER_REFILL_TARGET - this.balls;
    this.balls = DEALER_REFILL_TARGET;
    this.lastDealerClaimTime = Date.now();
    this.saveState();
    return { success: true, ballsGranted, nextClaimMs: DEALER_REFILL_COOLDOWN_MS };
  }

  // --- DEVELOPMENT SHIELD METER PLACEHOLDER ---
  // Product source of truth requires two independent configurable Blob meters.
  addBumperBounceCharge(): { currentCharges: number; shieldGranted: boolean; shieldExpiresAt: number } {
    this.shieldCharges++;
    let shieldGranted = false;

    if (this.shieldCharges >= 5) {
      this.shieldCharges = 0;
      const now = Date.now();
      const before = this.shieldExpiresAt;
      const currentExpiry = Math.max(now, before);
      this.shieldExpiresAt = Math.min(now + SHIELD_MAX_MS, currentExpiry + SHIELD_GRANT_MS);
      shieldGranted = this.shieldExpiresAt > before;
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
   * Requests an authoritative Pachinko result. Local resolution exists only for
   * explicit localhost development and must never be a production fallback.
   */
  async requestReleaseBall(
    currentPlacements: readonly CampPlacement[],
    clientActionId?: string
  ): Promise<ReleaseBallResult> {
    if (this.balls <= 0) throw new Error('No Balls available.');
    if (currentPlacements.length >= CAMP_CAPACITY) throw new Error('Battle Camp is full. Free a slot before spawning.');

    const actionId = clientActionId ?? `action_spawn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    let serverFailure = false;

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
      serverFailure = true;
    } catch {
      serverFailure = true;
    }

    if (serverFailure && !this.allowDevelopmentFallback) {
      throw new Error('Spawn authority unavailable. Ball was not consumed.');
    }

    // Explicit development-only simulation of the server-provided daily pool.
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

    // Prefer exposed cells, then any genuinely free cell. Never fabricate a
    // destination when the Camp is full or malformed.
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

    if (!destCell) throw new Error('Battle Camp has no free destination. Ball was not consumed.');

    this.balls = Math.max(0, this.balls - 1);
    this.saveState();

    return {
      clientActionId: actionId,
      rewardSlot: selectedSlot.slotIndex,
      createdSummon,
      destination: {
        summonInstanceId: createdSummon.id,
        cell: destCell,
      },
      ballsRemaining: this.balls,
      blobProgress: {},
      replay: {
        replayId: `replay_${actionId}`,
        rewardSlot: selectedSlot.slotIndex,
        presentationSeed: `seed_${Date.now()}`,
      },
    };
  }

  async resetLocalDb(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:54321/api/player/reset', { method: 'POST' });
      if (response.ok) {
        this.balls = DEALER_REFILL_TARGET;
        this.lastDealerClaimTime = 0;
        this.saveState();
        return true;
      }
    } catch {
      this.balls = DEALER_REFILL_TARGET;
      this.lastDealerClaimTime = 0;
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
