import type {
  CampPlacement,
  ReleaseBallResult,
  ReleaseSummonResult,
  CollectDealerStockResult,
  SpawnDailyPoolSlot,
  SummonInstance,
  Tier,
} from '@psyblr/contracts';
import {
  findFirstExposedCampCell,
  isCampCellOccupied,
  calculateDealerAccrual,
  canClaimDealerStock,
  claimDealerStock,
  getReleaseRefund,
  MAX_TIME_SHIELD_DURATION_MS,
  CAMP_CAPACITY,
} from '@psyblr/game-rules';

export class SpawnAuthorityService {
  private medals: number = 0;
  private dealerStock: number = 100;
  private lastDealerAccrualTime: number = Date.now();
  private timeShieldExpiresAt: number = 0; // Timestamp ms

  // Curated 6-Summon Daily Pool with exact canonical probabilities: [10, 15, 25, 25, 15, 10]
  // All normal V1 rewards are F tier
  private dailyPool: (SpawnDailyPoolSlot & { tier: Tier })[] = [
    { slotIndex: 0, summonDefinitionId: 'goku', probability: 0.10, tier: 'F' },
    { slotIndex: 1, summonDefinitionId: 'naruto', probability: 0.15, tier: 'F' },
    { slotIndex: 2, summonDefinitionId: 'luffy', probability: 0.25, tier: 'F' },
    { slotIndex: 3, summonDefinitionId: 'eren', probability: 0.25, tier: 'F' },
    { slotIndex: 4, summonDefinitionId: 'l', probability: 0.15, tier: 'F' },
    { slotIndex: 5, summonDefinitionId: 'lelouch', probability: 0.10, tier: 'F' },
  ];

  constructor() {
    this.loadPersistedState();
    this.refreshDealerStock();
    this.syncWithServerState().catch(() => {});
  }

  private canFetchServer(): boolean {
    const isTestEnv = typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV === 'test';
    return typeof fetch !== 'undefined' && !isTestEnv;
  }

  async syncWithServerState(): Promise<void> {
    if (!this.canFetchServer()) return;
    try {
      const response = await fetch('http://127.0.0.1:54321/api/player/state');
      if (response.ok) {
        const state = await response.json();
        if (state && state.spawnMachine) {
          this.medals = state.spawnMachine.medals ?? state.spawnMachine.balls ?? this.medals;
        }
        if (state && state.dealer) {
          this.dealerStock = state.dealer.generatedStock ?? this.dealerStock;
          this.lastDealerAccrualTime = state.dealer.lastAccrualTimestamp ?? this.lastDealerAccrualTime;
        }
        if (state && state.profile) {
          this.timeShieldExpiresAt = state.profile.timeShieldExpiresAt ? new Date(state.profile.timeShieldExpiresAt).getTime() : 0;
        }
        this.saveState();
      }
    } catch {
      // Offline fallback
    }
  }

  private loadPersistedState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedMedals = localStorage.getItem('psyblr_medals') ?? localStorage.getItem('psyblr_balls');
        if (savedMedals !== null) this.medals = parseInt(savedMedals, 10);

        const savedStock = localStorage.getItem('psyblr_dealer_stock');
        if (savedStock !== null) this.dealerStock = parseInt(savedStock, 10);

        const savedAccrual = localStorage.getItem('psyblr_last_dealer_accrual');
        if (savedAccrual !== null) this.lastDealerAccrualTime = parseInt(savedAccrual, 10);

        const savedShield = localStorage.getItem('psyblr_shield_expires');
        if (savedShield !== null) this.timeShieldExpiresAt = parseInt(savedShield, 10);
      }
    } catch {
      // Ignore storage errors in non-browser environments
    }
  }

  private saveState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('psyblr_medals', this.medals.toString());
        localStorage.setItem('psyblr_balls', this.medals.toString()); // compatibility
        localStorage.setItem('psyblr_dealer_stock', this.dealerStock.toString());
        localStorage.setItem('psyblr_last_dealer_accrual', this.lastDealerAccrualTime.toString());
        localStorage.setItem('psyblr_shield_expires', this.timeShieldExpiresAt.toString());
      }
    } catch {
      // Ignore storage errors
    }
  }

  getMedalsRemaining(): number {
    return this.medals;
  }

  getBallsRemaining(): number {
    return this.medals;
  }

  addMedals(count: number): void {
    this.medals += count;
    this.saveState();
  }

  addBalls(count: number): void {
    this.addMedals(count);
  }

  // --- DEALER 12-EPOCH GENERATION (100 Medals per 24 hours) ---
  public refreshDealerStock(): void {
    const now = Date.now();
    const result = calculateDealerAccrual(this.lastDealerAccrualTime, now, this.dealerStock);
    this.dealerStock = result.newStock;
    if (result.epochsElapsed > 0) {
      this.lastDealerAccrualTime = now - (now % (2 * 60 * 60 * 1000));
    }
    this.saveState();
  }

  getDealerStock(): number {
    this.refreshDealerStock();
    return this.dealerStock;
  }

  canClaimDealerStock(): boolean {
    return canClaimDealerStock(this.medals) && this.getDealerStock() > 0;
  }

  canClaimDailyDealer(): boolean {
    return this.canClaimDealerStock();
  }

  async requestCollectDealerStock(): Promise<CollectDealerStockResult> {
    this.refreshDealerStock();
    const actionId = `dealer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (this.canFetchServer()) {
      try {
        const response = await fetch('http://127.0.0.1:54321/api/economy/collect-dealer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientActionId: actionId }),
        });
        if (response.ok) {
          const serverResult = (await response.json()) as CollectDealerStockResult;
          this.medals = serverResult.newMedalBalance;
          this.dealerStock = serverResult.newDealerStock;
          this.saveState();
          return serverResult;
        }
      } catch {
        // Server offline fallback
      }
    }

    const claim = claimDealerStock(this.medals, this.dealerStock);
    this.medals = claim.newPlayerWallet;
    this.dealerStock = claim.newDealerStock;
    this.saveState();

    return {
      clientActionId: actionId,
      collectedStock: claim.claimedAmount,
      newMedalBalance: this.medals,
      newDealerStock: this.dealerStock,
    };
  }

  private shieldCharges: number = 0;

  addBumperBounceCharge(): { currentCharges: number; shieldGranted: boolean; shieldExpiresAt: number } {
    this.shieldCharges++;
    let shieldGranted = false;

    if (this.shieldCharges >= 5) {
      this.shieldCharges = 0;
      shieldGranted = true;
      const now = Date.now();
      const currentExpiry = Math.max(now, this.timeShieldExpiresAt);
      this.timeShieldExpiresAt = currentExpiry + 60 * 60 * 1000;
      this.saveState();
    }

    return {
      currentCharges: this.shieldCharges,
      shieldGranted,
      shieldExpiresAt: this.timeShieldExpiresAt,
    };
  }

  getShieldCharges(): number {
    return this.shieldCharges;
  }

  getTimeUntilNextDealerClaimMs(): number {
    const epochMs = 2 * 60 * 60 * 1000;
    const now = Date.now();
    const elapsed = now - this.lastDealerAccrualTime;
    const remaining = epochMs - (elapsed % epochMs);
    return Math.max(0, remaining);
  }

  // --- TIME SHIELD (Account-wide incoming raid protection, max 8 hours) ---
  grantTimeShieldOnDefenderLoss(): void {
    const now = Date.now();
    this.timeShieldExpiresAt = now + MAX_TIME_SHIELD_DURATION_MS;
    this.saveState();
  }

  breakTimeShieldOnOutgoingRaid(): void {
    this.timeShieldExpiresAt = 0;
    this.saveState();
  }

  isShieldActive(): boolean {
    return Date.now() < this.timeShieldExpiresAt;
  }

  getShieldRemainingTimeMs(): number {
    return Math.max(0, this.timeShieldExpiresAt - Date.now());
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
    if (this.canFetchServer()) {
      try {
        const response = await fetch('http://127.0.0.1:54321/api/economy/release-ball', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientActionId: actionId, currentPlacements }),
        });
        if (response.ok) {
          const serverResult = (await response.json()) as ReleaseBallResult;
          if (serverResult && serverResult.createdSummon) {
            this.medals = serverResult.medalsRemaining ?? serverResult.ballsRemaining ?? 0;
            this.saveState();
            return serverResult;
          }
        }
      } catch {
        // Local DB offline, fallback to standalone simulation
      }
    }

    if (currentPlacements.length >= CAMP_CAPACITY) {
      throw new Error('Battle camp is full (36/36)');
    }

    // Select reward slot based on canonical probability distribution [10, 15, 25, 25, 15, 10]
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

    if (!destCell) {
      throw new Error('Battle camp is full: No empty cell available');
    }

    const finalCell = destCell;
    this.medals = Math.max(0, this.medals - 1);
    this.saveState();

    const result: ReleaseBallResult = {
      clientActionId: actionId,
      rewardSlot: selectedSlot.slotIndex,
      createdSummon,
      destination: {
        summonInstanceId: createdSummon.id,
        cell: finalCell,
      },
      medalsRemaining: this.medals,
      ballsRemaining: this.medals,
      blobProgress: {},
      replay: {
        replayId: `replay_${actionId}`,
        rewardSlot: selectedSlot.slotIndex,
        presentationSeed: `seed_${Date.now()}`,
      },
    };

    return result;
  }

  /**
   * Authoritative release summon refund resolution.
   */
  async requestReleaseSummon(summon: SummonInstance, placementCell?: { x: number; y: number }): Promise<ReleaseSummonResult> {
    const actionId = `release_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (this.canFetchServer()) {
      try {
        const response = await fetch('http://127.0.0.1:54321/api/economy/release-summon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientActionId: actionId, summonInstanceId: summon.id }),
        });
        if (response.ok) {
          const serverResult = (await response.json()) as ReleaseSummonResult;
          this.medals = serverResult.newMedalBalance;
          this.saveState();
          return serverResult;
        }
      } catch {
        // Server offline fallback
      }
    }

    const refund = getReleaseRefund(summon.tier);
    this.medals += refund;
    this.saveState();

    return {
      clientActionId: actionId,
      releasedSummonInstanceId: summon.id,
      tier: summon.tier,
      medalsRefunded: refund,
      newMedalBalance: this.medals,
      freedCell: placementCell ?? { x: 0, y: 1 },
    };
  }

  reset(): void {
    this.medals = 0;
    this.dealerStock = 100;
    this.lastDealerAccrualTime = Date.now();
    this.timeShieldExpiresAt = 0;
    this.saveState();
  }

  async resetLocalDb(): Promise<boolean> {
    if (this.canFetchServer()) {
      try {
        const response = await fetch('http://127.0.0.1:54321/api/player/reset', { method: 'POST' });
        if (response.ok) {
          this.reset();
          return true;
        }
      } catch {
        this.reset();
      }
    } else {
      this.reset();
    }
    return false;
  }

  async seedMergeTest(): Promise<boolean> {
    if (this.canFetchServer()) {
      try {
        const response = await fetch('http://127.0.0.1:54321/api/player/seed-tier-test', { method: 'POST' });
        return response.ok;
      } catch {
        return false;
      }
    }
    return false;
  }
}
