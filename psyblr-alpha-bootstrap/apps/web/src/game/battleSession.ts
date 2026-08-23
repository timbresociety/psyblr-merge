import { createCombatState, stepCombat, type CombatState } from '@psyblr/combat-core';
import { combatFunctionDefinitions, getCreepDefinition, getSkillDefinition, getSummonDefinition, originDefinitions } from '@psyblr/game-content';
import { resolveFormationSynergies } from '@psyblr/game-rules';
import type { CombatCommand, CombatSnapshot, CombatUnitSnapshot } from '@psyblr/contracts';
import { emitGameInteraction } from './interactionEvents';
import { tutorialAllows, useGameStore, type BattleUnitView } from '../stores/gameStore';

const CREEP_FORMATION = [
  ['creep:brute:a', 'creep_brute', 2, 1], ['creep:brute:b', 'creep_brute', 5, 1],
  ['creep:scout:a', 'creep_scout', 1, 2], ['creep:scout:b', 'creep_scout', 6, 2],
  ['creep:shooter:a', 'creep_shooter', 3, 0], ['creep:shooter:b', 'creep_shooter', 4, 0],
] as const;

let runtime: CombatState | null = null;
let intervalId: number | null = null;
let queuedCommands: Array<{ command: CombatCommand; manual: boolean }> = [];
let firstReadyEmitted = false;
let pausedByTutorial = false;
export type CampaignBattleCheckpoint = { snapshot: CombatSnapshot; seed: number; tick: number; acceptedCommands: CombatCommand[]; autoCast: boolean; pausedByTutorial: boolean; firstReadyEmitted: boolean };

function seedFrom(value: string): number {
  return Array.from(value).reduce((seed, char) => ((seed * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
}
function viewUnits(state: CombatState): Record<string, BattleUnitView> {
  return Object.fromEntries(state.units.map((unit) => [unit.id, {
    id: unit.id, hp: unit.hp, maxHp: unit.maxHp, x: unit.x, z: unit.z, dead: unit.dead, shield: unit.shield,
  }]));
}
function buildPlayerUnit(instanceId: string, definitionId: string, spawnCell: { x: number; z: number }, modifiers: ReturnType<typeof resolveFormationSynergies>['byDefinitionId'][string]): CombatUnitSnapshot {
  const definition = getSummonDefinition(definitionId);
  const skill = getSkillDefinition(definition.skills.skill1);
  const hpPct = modifiers.maxHpPct + modifiers.durabilityPct;
  return { id: instanceId, definitionId, side: 'player', spawnCell, ...definition.stats, hp: Math.round(definition.stats.hp * (1 + hpPct)), attacksPerSecond: definition.stats.attacksPerSecond * (1 + modifiers.attackSpeedPct), skill1Id: skill.id, skill1: skill.mechanics ?? null, basicAttackDamagePct: modifiers.basicAttackDamagePct, skillPowerPct: modifiers.skillPowerPct, statusDurationPct: modifiers.statusDurationPct };
}
export function buildCampaignCombatSnapshot(): CombatSnapshot | null {
  const store = useGameStore.getState();
  if (store.placements.length !== 6) return null;
  const deployedDefinitions = store.placements.map((placement) => store.inventory.find((entry) => entry.id === placement.summonInstanceId)).filter((entry): entry is NonNullable<typeof entry> => entry !== undefined).map((instance) => getSummonDefinition(instance.definitionId));
  const synergies = resolveFormationSynergies(deployedDefinitions, originDefinitions, combatFunctionDefinitions);
  const players = store.placements.map((placement) => {
    const instance = store.inventory.find((entry) => entry.id === placement.summonInstanceId);
    return instance ? buildPlayerUnit(instance.id, instance.definitionId, placement.cell, synergies.byDefinitionId[instance.definitionId]!) : null;
  }).filter((entry): entry is CombatUnitSnapshot => entry !== null);
  if (players.length !== 6) return null;
  const enemies: CombatUnitSnapshot[] = CREEP_FORMATION.map(([id, definitionId, x, z]) => {
    const definition = getCreepDefinition(definitionId);
    return { id, definitionId, side: 'enemy', spawnCell: { x, z }, ...definition.stats, skill1Id: null, skill1: null, basicAttackDamagePct: 0, skillPowerPct: 0, statusDurationPct: 0 };
  });
  return { battleId: 'campaign-tutorial-001', mode: 'campaign', units: [...players, ...enemies] };
}
function stopTimer() { if (intervalId !== null) window.clearInterval(intervalId); intervalId = null; }
function startTimer() { stopTimer(); intervalId = window.setInterval(advance, 100); }
function advance() {
  if (!runtime || runtime.ended || pausedByTutorial) return;
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
  const acceptedManualActor = result.acceptedCommands.find((command) => currentCommands.some((entry) => entry.manual && entry.command.actorId === command.actorId))?.actorId;
  if (acceptedManualActor) emitGameInteraction({ type: 'SKILL_1_CAST_MANUAL', actorId: acceptedManualActor });
  const firstReadyActor = result.events.find((entry) => entry.type === 'skill_ready' && runtime!.units.find((unit) => unit.id === entry.actorId)?.side === 'player')?.actorId;
  if (!firstReadyEmitted && firstReadyActor) {
    firstReadyEmitted = true;
    emitGameInteraction({ type: 'FIRST_SKILL_READY', actorId: firstReadyActor });
  }
  const readySkillActorIds = runtime.units.filter((unit) => unit.side === 'player' && !unit.dead && unit.skill1 && unit.skillReadyAnnounced && unit.nextSkillReadyTick <= runtime!.tick).map((unit) => unit.id).sort();
  const deadUnitIds = runtime.units.filter((unit) => unit.dead).map((unit) => unit.id).sort();
  store.updateBattle(runtime.tick, result.events, viewUnits(runtime), readySkillActorIds, deadUnitIds);
  if (runtime.ended) {
    stopTimer();
    const phase = runtime.winner === 'player' ? 'victory' : runtime.winner === 'enemy' ? 'defeat' : 'draw';
    store.finishBattle(phase, []);
    emitGameInteraction({ type: 'BATTLE_ENDED', outcome: phase });
  }
}
export function startCampaignBattle() {
  const snapshot = buildCampaignCombatSnapshot();
  if (!snapshot || useGameStore.getState().battlePhase !== 'setup' || !tutorialAllows('START_BATTLE')) return false;
  stopTimer(); queuedCommands = []; firstReadyEmitted = false; pausedByTutorial = false;
  runtime = createCombatState(snapshot, seedFrom(useGameStore.getState().simulationSeed));
  useGameStore.getState().beginBattle(snapshot, runtime.events.slice(), viewUnits(runtime));
  emitGameInteraction({ type: 'BATTLE_STARTED' });
  startTimer();
  return true;
}
export function requestManualSkillCast(actorId: string) {
  if (!runtime || runtime.ended || !tutorialAllows('CAST_SKILL_1')) return false;
  if (queuedCommands.some((entry) => entry.manual && entry.command.actorId === actorId && entry.command.issuedAtTick === runtime!.tick)) return false;
  queuedCommands.push({ command: { type: 'cast_skill_1', actorId, issuedAtTick: runtime.tick }, manual: true });
  if (pausedByTutorial) advanceCampaignBattleOneTick();
  return true;
}
export function setBattleAutoCast(enabled: boolean) {
  if (enabled && !tutorialAllows('TOGGLE_AUTO_CAST')) return;
  useGameStore.getState().setAutoCast(enabled);
  if (enabled) emitGameInteraction({ type: 'AUTO_CAST_ENABLED' });
}
export function pauseCampaignBattle() { if (runtime && !runtime.ended) pausedByTutorial = true; }
export function resumeCampaignBattle() { pausedByTutorial = false; }
export function advanceCampaignBattleOneTick() {
  if (!runtime || runtime.ended) return false;
  const wasPaused = pausedByTutorial; pausedByTutorial = false; advance(); pausedByTutorial = wasPaused;
  return true;
}
export function isCampaignBattlePaused() { return pausedByTutorial; }
export function getCampaignBattleCheckpoint(): CampaignBattleCheckpoint | null {
  if (!runtime) return null;
  return { snapshot: structuredClone(runtime.snapshot), seed: runtime.seed, tick: runtime.tick, acceptedCommands: structuredClone(runtime.acceptedCommands), autoCast: useGameStore.getState().autoCast, pausedByTutorial, firstReadyEmitted };
}
export function restoreCampaignBattle(checkpoint: CampaignBattleCheckpoint) {
  stopTimer(); queuedCommands = []; runtime = createCombatState(checkpoint.snapshot, checkpoint.seed);
  while (!runtime.ended && runtime.tick < checkpoint.tick) stepCombat(runtime, checkpoint.acceptedCommands.filter((command) => command.issuedAtTick === runtime!.tick));
  firstReadyEmitted = checkpoint.firstReadyEmitted; pausedByTutorial = checkpoint.pausedByTutorial;
  const ready = runtime.units.filter((unit) => unit.side === 'player' && !unit.dead && unit.skill1 && unit.skillReadyAnnounced && unit.nextSkillReadyTick <= runtime!.tick).map((unit) => unit.id).sort();
  const dead = runtime.units.filter((unit) => unit.dead).map((unit) => unit.id).sort();
  useGameStore.setState({ battlePhase: runtime.ended ? (runtime.winner === 'player' ? 'victory' : runtime.winner === 'enemy' ? 'defeat' : 'draw') : 'running', battleSnapshot: checkpoint.snapshot, battleEvents: runtime.events.slice(), battleTick: runtime.tick, battleUnits: viewUnits(runtime), readySkillActorIds: ready, deadUnitIds: dead, autoCast: checkpoint.autoCast, summonTrayOpen: false, summonDetailsOpen: false });
  if (!runtime.ended && !pausedByTutorial) startTimer();
}
export function resetCampaignBattleToSetup() { stopTimer(); runtime = null; queuedCommands = []; firstReadyEmitted = false; pausedByTutorial = false; useGameStore.setState({ battlePhase: 'setup', battleSnapshot: null, battleEvents: [], battleTick: 0, readySkillActorIds: [], deadUnitIds: [], battleUnits: {}, autoCast: false }); }
