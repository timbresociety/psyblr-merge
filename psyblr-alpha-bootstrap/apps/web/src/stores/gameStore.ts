import { create } from 'zustand';
import { createStarterSummonInstances } from '@psyblr/game-content';
import { canDeploySummon, recallBattlefieldPlacement } from '@psyblr/game-rules';
import type { BattleCell, BattlefieldPlacement, CombatEvent, CombatSnapshot, SummonInstance } from '@psyblr/contracts';
import { sameBattleCell } from '../game/battlefield';
import { emitCampaignInteraction } from '../game/interactionEvents';

export type SceneId = 'campaign'|'base'|'raid';

export type PerformanceSnapshot = {
  fps: number;
  frameTimeMs: number;
};

export type PlacementMode = 'idle' | 'selected' | 'dragging';
export type BattlePhase = 'setup' | 'running' | 'victory' | 'defeat' | 'draw';
export type BattleUnitView = { id: string; hp: number; maxHp: number; x: number; z: number; dead: boolean; shield: number };

type GameState = {
  scene: SceneId;
  debugOpen: boolean;
  autoCast: boolean;
  battlePhase: BattlePhase;
  battleSnapshot: CombatSnapshot | null;
  battleEvents: CombatEvent[];
  battleTick: number;
  readySkillActorIds: string[];
  deadUnitIds: string[];
  battleUnits: Record<string, BattleUnitView>;
  inventory: SummonInstance[];
  placements: BattlefieldPlacement[];
  selectedSummonInstanceId: string | null;
  summonTrayOpen: boolean;
  summonDetailsOpen: boolean;
  placementMode: PlacementMode;
  hoveredBattleCell: BattleCell | null;
  tutorialStepId: string;
  boardOccupancy: number;
  boardCapacity: number;
  balls: number;
  ballCapacity: number;
  simulationSeed: string;
  performance: PerformanceSnapshot;
  setScene: (scene: SceneId) => void;
  toggleDebug: () => void;
  setAutoCast: (autoCast: boolean) => void;
  beginBattle: (snapshot: CombatSnapshot, events: CombatEvent[], units: Record<string, BattleUnitView>) => void;
  updateBattle: (tick: number, events: CombatEvent[], units: Record<string, BattleUnitView>, readySkillActorIds: string[], deadUnitIds: string[]) => void;
  finishBattle: (phase: Exclude<BattlePhase, 'setup' | 'running'>, events: CombatEvent[]) => void;
  openSummonTray: () => void;
  closeSummonTray: () => void;
  closeSummonDetails: () => void;
  selectSummon: (id: string | null) => void;
  beginPlacement: (id: string) => void;
  beginSummonDrag: (id: string) => void;
  setHoveredBattleCell: (cell: BattleCell | null) => void;
  requestPlacement: (cell: BattleCell) => void;
  recallSummon: (id: string) => void;
  cancelPlacement: () => void;
  reportPerformance: (performance: PerformanceSnapshot) => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  scene: 'campaign',
  debugOpen: false,
  autoCast: false,
  battlePhase: 'setup',
  battleSnapshot: null,
  battleEvents: [],
  battleTick: 0,
  readySkillActorIds: [],
  deadUnitIds: [],
  battleUnits: {},
  inventory: createStarterSummonInstances(),
  placements: [],
  selectedSummonInstanceId: null,
  summonTrayOpen: false,
  summonDetailsOpen: false,
  placementMode: 'idle',
  hoveredBattleCell: null,
  tutorialStepId: 'campaign_open_inventory',
  boardOccupancy: 0,
  boardCapacity: 64,
  balls: 100,
  ballCapacity: 100,
  simulationSeed: 'tutorial-001',
  performance: { fps: 0, frameTimeMs: 0 },
  setScene: (scene) => set({ scene }),
  toggleDebug: () => set((state) => ({ debugOpen: !state.debugOpen })),
  setAutoCast: (autoCast) => set({ autoCast }),
  beginBattle: (battleSnapshot, battleEvents, battleUnits) => set({
    battlePhase: 'running', battleSnapshot, battleEvents, battleUnits, battleTick: 0,
    readySkillActorIds: [], deadUnitIds: [], autoCast: false, summonTrayOpen: false, summonDetailsOpen: false,
    placementMode: 'idle', hoveredBattleCell: null, selectedSummonInstanceId: null,
  }),
  updateBattle: (battleTick, events, battleUnits, readySkillActorIds, deadUnitIds) => set((state) => ({
    battleTick, battleEvents: [...state.battleEvents, ...events], battleUnits, readySkillActorIds, deadUnitIds,
  })),
  finishBattle: (battlePhase, events) => set((state) => ({
    battlePhase, battleEvents: [...state.battleEvents, ...events], readySkillActorIds: [],
  })),
  openSummonTray: () => {
    if (get().battlePhase !== 'setup') return;
    set({ summonTrayOpen: true });
    emitCampaignInteraction('INVENTORY_OPENED');
  },
  closeSummonTray: () => set({
    summonTrayOpen: false,
    summonDetailsOpen: false,
    placementMode: 'idle',
    hoveredBattleCell: null,
  }),
  closeSummonDetails: () => set({
    summonDetailsOpen: false,
    placementMode: 'idle',
    hoveredBattleCell: null,
  }),
  selectSummon: (selectedSummonInstanceId) => {
    if (get().battlePhase !== 'setup') return;
    set({
      selectedSummonInstanceId,
      summonDetailsOpen: selectedSummonInstanceId !== null,
      placementMode: selectedSummonInstanceId === null ? 'idle' : 'selected',
      hoveredBattleCell: null,
    });
    if (selectedSummonInstanceId) emitCampaignInteraction('SUMMON_SELECTED', selectedSummonInstanceId);
  },
  beginPlacement: (selectedSummonInstanceId) => {
    if (get().battlePhase !== 'setup') return;
    set({ selectedSummonInstanceId, summonDetailsOpen: true, placementMode: 'selected', hoveredBattleCell: null });
  },
  beginSummonDrag: (selectedSummonInstanceId) => {
    if (get().battlePhase !== 'setup') return;
    set({
      selectedSummonInstanceId,
      summonTrayOpen: true,
      summonDetailsOpen: true,
      placementMode: 'dragging',
      hoveredBattleCell: null,
    });
    emitCampaignInteraction('SUMMON_DRAG_STARTED', selectedSummonInstanceId);
  },
  setHoveredBattleCell: (hoveredBattleCell) => set((state) => (
    state.battlePhase !== 'setup' || sameBattleCell(state.hoveredBattleCell, hoveredBattleCell) ? state : { hoveredBattleCell }
  )),
  requestPlacement: (cell) => {
    const state = get();
    if (state.battlePhase !== 'setup') return;
    const instanceId = state.selectedSummonInstanceId;
    if (!instanceId || !canDeploySummon(instanceId, cell, state.placements)) return;
    const withoutCurrent = state.placements.filter((placement) => placement.summonInstanceId !== instanceId);
    const placements = [...withoutCurrent, { summonInstanceId: instanceId, cell }];
    set({
      placements,
      boardOccupancy: placements.length,
      placementMode: 'idle',
      hoveredBattleCell: null,
    });
    emitCampaignInteraction('SUMMON_PLACED', instanceId);
    if (placements.length === 6) emitCampaignInteraction('TEAM_SIZE_6');
  },
  recallSummon: (id) => set((state) => {
    if (state.battlePhase !== 'setup') return state;
    const placements = recallBattlefieldPlacement(id, state.placements);
    return {
      placements,
      boardOccupancy: placements.length,
      placementMode: 'idle',
      hoveredBattleCell: null,
    };
  }),
  cancelPlacement: () => { if (get().battlePhase === 'setup') set({ placementMode: 'idle', hoveredBattleCell: null }); },
  reportPerformance: (performance) => set({ performance }),
}));
