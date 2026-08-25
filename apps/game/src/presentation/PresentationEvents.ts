import type { CampCell } from '@psyblr/contracts';

export type PresentationEventMap = {
  summonGrabbed: {
    summonId: string;
    startCell: CampCell;
    worldPosition: [number, number, number];
  };
  dragTargetChanged: {
    summonId: string;
    previousCell: CampCell | null;
    currentCell: CampCell | null;
    worldPosition: [number, number, number] | null;
  };
  summonPlaced: {
    summonId: string;
    fromCell: CampCell;
    toCell: CampCell;
    worldPosition: [number, number, number];
  };
  summonReturned: {
    summonId: string;
    targetCell: CampCell;
    worldPosition: [number, number, number];
  };
  mergeCompleted: {
    sourceId: string;
    targetId: string;
    upgradedTier: string;
    worldPosition: [number, number, number];
  };
  spawnLanded: {
    summonId: string;
    definitionId: string;
    cell: CampCell;
  };
  campaignWon: Record<string, never>;
  dealerStockCollected: { medals?: number } | Record<string, never>;
  pachinkoEntered: Record<string, never>;
  raidEntered: Record<string, never>;
  raidWon: Record<string, never>;
  stealCompleted: {
    summonId: string;
  };
  tutorialStepChanged: {
    phase: string;
  };
};

export type PresentationEventType = keyof PresentationEventMap;
export type PresentationEventListener<K extends PresentationEventType> = (
  payload: PresentationEventMap[K]
) => void;

export class PresentationEventEmitter {
  private listeners = new Map<PresentationEventType, Set<PresentationEventListener<any>>>();

  on<K extends PresentationEventType>(type: K, listener: PresentationEventListener<K>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
    return () => this.off(type, listener);
  }

  off<K extends PresentationEventType>(type: K, listener: PresentationEventListener<K>): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  emit<K extends PresentationEventType>(type: K, payload: PresentationEventMap[K]): void {
    const set = this.listeners.get(type);
    if (set) {
      for (const listener of set) {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[PresentationEvents] Error in listener for ${type}:`, err);
        }
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
