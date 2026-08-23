import type { CombatEvent, RaidRoundResult } from '@psyblr/contracts';
import { useGameStore, type BattleUnitView } from '../stores/gameStore';

let timer: number | null = null;
const PLAYBACK_SPEED = 4;
function stop() { if (timer !== null) window.clearInterval(timer); timer = null; }
function initialUnits(round: RaidRoundResult): Record<string, BattleUnitView> {
  return Object.fromEntries(round.combatSnapshot.units.map((unit) => [unit.id, { id: unit.id, hp: unit.hp, maxHp: unit.hp, x: unit.spawnCell.x * 1000, z: unit.spawnCell.z * 1000, dead: false, shield: 0 }]));
}
export function applyRaidEvents(units: Record<string, BattleUnitView>, events: readonly CombatEvent[]): Record<string, BattleUnitView> {
  const next = { ...units };
  for (const event of events) {
    const actor = event.actorId ? next[event.actorId] : undefined; const target = event.targetId ? next[event.targetId] : undefined;
    if (event.type === 'move' && actor) next[event.actorId!] = { ...actor, x: Number(event.payload.x), z: Number(event.payload.z) };
    if (event.type === 'damage' && target) next[event.targetId!] = { ...target, hp: Number(event.payload.remainingHp) };
    if (event.type === 'death' && actor) next[event.actorId!] = { ...actor, hp: 0, dead: true };
    if (event.type === 'shield_changed' && target) next[event.targetId!] = { ...target, shield: Number(event.payload.shield) };
  }
  return next;
}
/** Presentation consumes one returned round only; the next deployment remains a player action. */
export function startRaidRoundReplay(round: RaidRoundResult, roundIndex: number) {
  stop(); let cursor = 0; let elapsedMs = 0; let units = initialUnits(round);
  useGameStore.setState({ raidStatus: 'replaying', raidReplayRoundIndex: roundIndex, raidReplayUnits: units });
  timer = window.setInterval(() => {
    elapsedMs += 50 * PLAYBACK_SPEED; const due: CombatEvent[] = [];
    while (cursor < round.events.length && round.events[cursor]!.tick <= Math.floor(elapsedMs / 100)) due.push(round.events[cursor++]!);
    if (due.length) { units = applyRaidEvents(units, due); useGameStore.setState({ raidReplayUnits: units }); }
    if (cursor < round.events.length) return;
    stop(); useGameStore.setState({ raidReplayUnits: units });
    window.setTimeout(() => useGameStore.getState().finishRaidRoundReplay(), 500);
  }, 50);
}
