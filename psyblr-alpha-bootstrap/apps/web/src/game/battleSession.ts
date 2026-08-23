import { createCombatState, stepCombat, type CombatState } from '@psyblr/combat-core';
import { getCreepDefinition, getSkillDefinition, getSummonDefinition } from '@psyblr/game-content';
import type { CombatCommand, CombatSnapshot, CombatUnitSnapshot } from '@psyblr/contracts';
import { emitCampaignInteraction } from './interactionEvents';
import { useGameStore, type BattleUnitView } from '../stores/gameStore';

const CREEP_FORMATION = [
  ['creep:brute:a', 'creep_brute', 2, 1], ['creep:brute:b', 'creep_brute', 5, 1],
  ['creep:scout:a', 'creep_scout', 1, 2], ['creep:scout:b', 'creep_scout', 6, 2],
  ['creep:shooter:a', 'creep_shooter', 3, 0], ['creep:shooter:b', 'creep_shooter', 4, 0],
] as const;

let runtime: CombatState | null = null;
let intervalId: number | null = null;
let queuedCommands: Array<{ command: CombatCommand; manual: boolean }> = [];
let firstReadyEmitted = false;

function seedFrom(value: string): number {
  return Array.from(value).reduce((seed, char) => ((seed * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
}
function viewUnits(state: CombatState): Record<string, BattleUnitView> {
  return Object.fromEntries(state.units.map((unit) => [unit.id, {
    id: unit.id, hp: unit.hp, maxHp: unit.maxHp, x: unit.x, z: unit.z, dead: unit.dead, shield: unit.shield,
  }]));
}
function buildPlayerUnit(instanceId: string, definitionId: string, spawnCell: { x: number; z: number }): CombatUnitSnapshot {
  const definition = getSummonDefinition(definitionId);
  const skill = getSkillDefinition(definition.skills.skill1);
  return { id: instanceId, definitionId, side: 'player', spawnCell, ...definition.stats, skill1Id: skill.id, skill1: skill.mechanics ?? null };
}
export function buildCampaignCombatSnapshot(): CombatSnapshot | null {
  const store = useGameStore.getState();
  if (store.placements.length !== 6) return null;
  const players = store.placements.map((placement) => {
    const instance = store.inventory.find((entry) => entry.id === placement.summonInstanceId);
    return instance ? buildPlayerUnit(instance.id, instance.definitionId, placement.cell) : null;
  }).filter((entry): entry is CombatUnitSnapshot => entry !== null);
  if (players.length !== 6) return null;
  const enemies: CombatUnitSnapshot[] = CREEP_FORMATION.map(([id, definitionId, x, z]) => {
    const definition = getCreepDefinition(definitionId);
    return { id, definitionId, side: 'enemy', spawnCell: { x, z }, ...definition.stats, skill1Id: null, skill1: null };
  });
  return { battleId: 'campaign-tutorial-001', mode: 'campaign', units: [...players, ...enemies] };
}
function stopTimer() { if (intervalId !== null) window.clearInterval(intervalId); intervalId = null; }
function advance() {
  if (!runtime || runtime.ended) return;
  const store = useGameStore.getState();
  if (store.autoCast) {
    for (const unit of runtime.units.filter((entry) => entry.side === 'player' && !entry.dead && entry.skill1 && entry.nextSkillReadyTick <= runtime!.tick).sort((a, b) => a.id.localeCompare(b.id))) {
      if (!queuedCommands.some((entry) => entry.command.actorId === unit.id && entry.command.issuedAtTick === runtime!.tick)) queuedCommands.push({ command: { type: 'cast_skill_1', actorId: unit.id, issuedAtTick: runtime.tick }, manual: false });
    }
  }
  const currentCommands = queuedCommands.filter((entry) => entry.command.issuedAtTick === runtime!.tick);
  queuedCommands = queuedCommands.filter((entry) => entry.command.issuedAtTick !== runtime!.tick);
  const result = stepCombat(runtime, currentCommands.map((entry) => entry.command));
  const acceptedManual = result.acceptedCommands.some((command) => currentCommands.some((entry) => entry.manual && entry.command.actorId === command.actorId));
  if (acceptedManual) emitCampaignInteraction('SKILL_1_CAST_MANUAL');
  if (!firstReadyEmitted && result.events.some((entry) => entry.type === 'skill_ready' && runtime!.units.find((unit) => unit.id === entry.actorId)?.side === 'player')) {
    firstReadyEmitted = true;
    emitCampaignInteraction('FIRST_SKILL_READY');
  }
  const readySkillActorIds = runtime.units.filter((unit) => unit.side === 'player' && !unit.dead && unit.skill1 && unit.skillReadyAnnounced && unit.nextSkillReadyTick <= runtime!.tick).map((unit) => unit.id).sort();
  const deadUnitIds = runtime.units.filter((unit) => unit.dead).map((unit) => unit.id).sort();
  store.updateBattle(runtime.tick, result.events, viewUnits(runtime), readySkillActorIds, deadUnitIds);
  if (runtime.ended) {
    stopTimer();
    const phase = runtime.winner === 'player' ? 'victory' : runtime.winner === 'enemy' ? 'defeat' : 'draw';
    store.finishBattle(phase, []);
    emitCampaignInteraction('BATTLE_ENDED');
  }
}
export function startCampaignBattle() {
  const snapshot = buildCampaignCombatSnapshot();
  if (!snapshot || useGameStore.getState().battlePhase !== 'setup') return false;
  stopTimer(); queuedCommands = []; firstReadyEmitted = false;
  runtime = createCombatState(snapshot, seedFrom(useGameStore.getState().simulationSeed));
  useGameStore.getState().beginBattle(snapshot, runtime.events.slice(), viewUnits(runtime));
  emitCampaignInteraction('BATTLE_STARTED');
  intervalId = window.setInterval(advance, 100);
  return true;
}
export function requestManualSkillCast(actorId: string) {
  if (!runtime || runtime.ended) return false;
  if (queuedCommands.some((entry) => entry.manual && entry.command.actorId === actorId && entry.command.issuedAtTick === runtime!.tick)) return false;
  queuedCommands.push({ command: { type: 'cast_skill_1', actorId, issuedAtTick: runtime.tick }, manual: true });
  return true;
}
export function setBattleAutoCast(enabled: boolean) {
  useGameStore.getState().setAutoCast(enabled);
  if (enabled) emitCampaignInteraction('AUTO_CAST_ENABLED');
}
