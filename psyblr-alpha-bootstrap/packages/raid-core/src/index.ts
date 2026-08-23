import { runCombatAutoCast } from '@psyblr/combat-core';
import { combatFunctionDefinitions, getSkillDefinition, getSummonDefinition, originDefinitions } from '@psyblr/game-content';
import { resolveFormationSynergies, resolveTierStats, RAID_ROUND_DEFINITIONS } from '@psyblr/game-rules';
import type { CombatSnapshot, CombatUnitSnapshot, RaidCanonicalSquad, RaidOutcome, RaidRoundDefinition, RaidRoundId, RaidRoundResult, RaidSeed, RaidSquadSnapshot, RaidSummonSnapshot } from '@psyblr/contracts';

export const RAID_FORMATIONS: Record<2 | 4 | 6, { player: ReadonlyArray<{ x: number; z: number }>; enemy: ReadonlyArray<{ x: number; z: number }> }> = {
  2: { player: [{ x: 2, z: 6 }, { x: 5, z: 6 }], enemy: [{ x: 2, z: 1 }, { x: 5, z: 1 }] },
  4: { player: [{ x: 2, z: 5 }, { x: 5, z: 5 }, { x: 2, z: 6 }, { x: 5, z: 6 }], enemy: [{ x: 2, z: 2 }, { x: 5, z: 2 }, { x: 2, z: 1 }, { x: 5, z: 1 }] },
  6: { player: [{ x: 1, z: 5 }, { x: 3, z: 5 }, { x: 5, z: 5 }, { x: 2, z: 6 }, { x: 4, z: 6 }, { x: 6, z: 6 }], enemy: [{ x: 1, z: 2 }, { x: 3, z: 2 }, { x: 5, z: 2 }, { x: 2, z: 1 }, { x: 4, z: 1 }, { x: 6, z: 1 }] },
};

export function canonicalSquad(snapshot: RaidSquadSnapshot): RaidCanonicalSquad {
  return { contentVersion: snapshot.contentVersion, round1: structuredClone(snapshot.round1), round2: structuredClone(snapshot.round2), round3: structuredClone(snapshot.round3) };
}
export function deriveRoundSeed(rootSeed: RaidSeed, roundId: RaidRoundId): RaidSeed {
  let hash = 2166136261;
  for (const char of `${rootSeed}:${roundId}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `r${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
export function seedToNumber(seed: RaidSeed): number {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
function asUnit(summon: RaidSummonSnapshot, side: 'player' | 'enemy', spawnCell: { x: number; z: number }, id: string, modifiers: ReturnType<typeof resolveFormationSynergies>['byDefinitionId'][string]): CombatUnitSnapshot {
  const definition = getSummonDefinition(summon.definitionId);
  const skill = getSkillDefinition(definition.skills.skill1);
  const stats = resolveTierStats(definition.stats, summon.tier);
  return { id, definitionId: summon.definitionId, side, spawnCell, ...stats, hp: Math.round(stats.hp * (1 + modifiers.maxHpPct + modifiers.durabilityPct)), attacksPerSecond: stats.attacksPerSecond * (1 + modifiers.attackSpeedPct), skill1Id: skill.id, skill1: skill.mechanics ?? null, basicAttackDamagePct: modifiers.basicAttackDamagePct, skillPowerPct: modifiers.skillPowerPct, statusDurationPct: modifiers.statusDurationPct };
}
function roundSquad(squad: RaidCanonicalSquad, id: RaidRoundId): RaidSummonSnapshot[] { return squad[id]; }
function sideUnits(summons: RaidSummonSnapshot[], side: 'player' | 'enemy', cells: ReadonlyArray<{ x: number; z: number }>, roundId: RaidRoundId): CombatUnitSnapshot[] {
  const definitions = summons.map((summon) => getSummonDefinition(summon.definitionId));
  const synergies = resolveFormationSynergies(definitions, originDefinitions, combatFunctionDefinitions);
  return summons.map((summon, index) => asUnit(summon, side, cells[index]!, `${side === 'player' ? 'attacker' : 'defender'}:${roundId}:${index}:${summon.instanceId}`, synergies.byDefinitionId[summon.definitionId]!));
}
export function buildRaidRoundSnapshot(attacker: RaidCanonicalSquad, defender: RaidCanonicalSquad, round: RaidRoundDefinition, raidId: string): CombatSnapshot {
  return buildRaidRoundSnapshotFromSummons(roundSquad(attacker, round.id), roundSquad(defender, round.id), round, raidId);
}
export function buildRaidRoundSnapshotFromSummons(attacker: RaidSummonSnapshot[], defender: RaidSummonSnapshot[], round: RaidRoundDefinition, raidId: string): CombatSnapshot {
  const formation = RAID_FORMATIONS[round.slotCount];
  const attackerUnits = sideUnits(attacker, 'player', formation.player, round.id);
  const defenderUnits = sideUnits(defender, 'enemy', formation.enemy, round.id);
  return { battleId: `${raidId}:${round.id}`, mode: 'raid', units: [...attackerUnits, ...defenderUnits] };
}
export function combatWinnerToRaidOutcome(winner: 'player' | 'enemy' | 'draw' | null): RaidOutcome { return winner === 'player' ? 'win' : winner === 'enemy' ? 'loss' : 'draw'; }
export function resolveRaidOutcome(rounds: readonly Pick<RaidRoundResult, 'outcome'>[]): RaidOutcome {
  const wins = rounds.filter((round) => round.outcome === 'win').length;
  const losses = rounds.filter((round) => round.outcome === 'loss').length;
  return wins === losses ? 'draw' : wins > losses ? 'win' : 'loss';
}
export type RaidSimulationOptions = { transformSnapshot?: (snapshot: CombatSnapshot, round: RaidRoundDefinition) => CombatSnapshot };
export function simulateRaidRound(attacker: RaidSummonSnapshot[], defender: RaidSummonSnapshot[], rootSeed: RaidSeed, raidId: string, round: RaidRoundDefinition, options: RaidSimulationOptions = {}): RaidRoundResult {
  const seed = deriveRoundSeed(rootSeed, round.id);
  const input = buildRaidRoundSnapshotFromSummons(attacker, defender, round, raidId);
  const combatSnapshot = options.transformSnapshot ? options.transformSnapshot(structuredClone(input), round) : input;
  const state = runCombatAutoCast(combatSnapshot, seedToNumber(seed));
  return { roundId: round.id, roundSize: round.slotCount, seed, outcome: combatWinnerToRaidOutcome(state.winner), combatSnapshot, events: structuredClone(state.events) };
}
export function simulateRaid(attacker: RaidCanonicalSquad, defender: RaidCanonicalSquad, rootSeed: RaidSeed, raidId: string, options: RaidSimulationOptions = {}): { rounds: RaidRoundResult[]; outcome: RaidOutcome } {
  const rounds = RAID_ROUND_DEFINITIONS.map((round) => simulateRaidRound(roundSquad(attacker, round.id), roundSquad(defender, round.id), rootSeed, raidId, round, options));
  return { rounds, outcome: resolveRaidOutcome(rounds) };
}
