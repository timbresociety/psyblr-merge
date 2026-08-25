import { runCombatAutoCast } from '@psyblr/combat-core';
import { allianceDefinitions, getSkillDefinition, getSummonDefinition } from '@psyblr/game-content';
import { resolveAllianceSynergies, resolveTierStats, RAID_ROUND_DEFINITIONS } from '@psyblr/game-rules';
import type {
  BattleCell,
  CombatSnapshot,
  CombatUnitSnapshot,
  RaidCanonicalSquad,
  RaidFormationPlacement,
  RaidOutcome,
  RaidRoundDefinition,
  RaidRoundId,
  RaidRoundResult,
  RaidSeed,
  RaidSquadSnapshot,
  RaidSummonSnapshot,
} from '@psyblr/contracts';

export const RAID_FORMATIONS: Record<2 | 4 | 6, { player: ReadonlyArray<{ x: number; z: number }>; enemy: ReadonlyArray<{ x: number; z: number }> }> = {
  2: { player: [{ x: 2, z: 6 }, { x: 5, z: 6 }], enemy: [{ x: 2, z: 1 }, { x: 5, z: 1 }] },
  4: { player: [{ x: 2, z: 5 }, { x: 5, z: 5 }, { x: 2, z: 6 }, { x: 5, z: 6 }], enemy: [{ x: 2, z: 2 }, { x: 5, z: 2 }, { x: 2, z: 1 }, { x: 5, z: 1 }] },
  6: { player: [{ x: 1, z: 5 }, { x: 3, z: 5 }, { x: 5, z: 5 }, { x: 2, z: 6 }, { x: 4, z: 6 }, { x: 6, z: 6 }], enemy: [{ x: 1, z: 2 }, { x: 3, z: 2 }, { x: 5, z: 2 }, { x: 2, z: 1 }, { x: 4, z: 1 }, { x: 6, z: 1 }] },
};

export function canonicalSquad(snapshot: RaidSquadSnapshot): RaidCanonicalSquad {
  return {
    contentVersion: snapshot.contentVersion,
    round1: structuredClone(snapshot.round1),
    round2: structuredClone(snapshot.round2),
    round3: structuredClone(snapshot.round3),
  };
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

/** Store formations in an unambiguous deterministic order for replay/event IDs. */
export function stableFormation<T extends { summon: RaidSummonSnapshot; cell: BattleCell }>(placements: readonly T[]): T[] {
  return [...placements].sort((a, b) => a.cell.z - b.cell.z || a.cell.x - b.cell.x || a.summon.instanceId.localeCompare(b.summon.instanceId));
}

export function mirrorDefenseCell(cell: BattleCell): BattleCell {
  return { x: cell.x, z: 7 - cell.z };
}

function asUnit(
  summon: RaidSummonSnapshot,
  side: 'player' | 'enemy',
  spawnCell: { x: number; z: number },
  id: string,
  modifiers: ReturnType<typeof resolveAllianceSynergies>['byDefinitionId'][string]
): CombatUnitSnapshot {
  const definition = getSummonDefinition(summon.definitionId);
  const skill = getSkillDefinition(definition.skills.skill1);
  const stats = resolveTierStats(definition.stats, summon.tier);
  const hpMod = modifiers ? modifiers.maxHpPct + modifiers.durabilityPct : 0;
  const apsMod = modifiers ? modifiers.attackSpeedPct : 0;
  const basicMod = modifiers ? modifiers.basicAttackDamagePct : 0;
  const spMod = modifiers ? modifiers.skillPowerPct : 0;
  const statusMod = modifiers ? modifiers.statusDurationPct : 0;

  return {
    id,
    definitionId: summon.definitionId,
    side,
    spawnCell,
    ...stats,
    hp: Math.round(stats.hp * (1 + hpMod)),
    attacksPerSecond: stats.attacksPerSecond * (1 + apsMod),
    skill1Id: skill.id,
    skill1: skill.mechanics ?? null,
    basicAttackDamagePct: basicMod,
    skillPowerPct: spMod,
    statusDurationPct: statusMod,
  };
}

function roundSquad(squad: RaidCanonicalSquad, id: RaidRoundId): RaidSummonSnapshot[] {
  return squad[id];
}

function sideUnits(
  summons: RaidSummonSnapshot[],
  side: 'player' | 'enemy',
  cells: ReadonlyArray<{ x: number; z: number }>,
  roundId: RaidRoundId
): CombatUnitSnapshot[] {
  const definitions = summons.map((summon) => getSummonDefinition(summon.definitionId));
  const synergies = resolveAllianceSynergies(definitions, allianceDefinitions);
  return summons.map((summon, index) =>
    asUnit(
      summon,
      side,
      cells[index]!,
      `${side === 'player' ? 'attacker' : 'defender'}:${roundId}:${index}:${summon.instanceId}`,
      synergies.byDefinitionId[summon.definitionId]!
    )
  );
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

/** Uses selected player cells verbatim. Defender cells are stored player-normalized
 * and mirrored onto the enemy half at battle time. */
export function buildRaidRoundSnapshotFromPlacements(
  attacker: readonly RaidFormationPlacement[],
  defender: readonly RaidFormationPlacement[],
  round: RaidRoundDefinition,
  raidId: string
): CombatSnapshot {
  if (attacker.length !== round.slotCount || defender.length !== round.slotCount) {
    throw new Error(`Expected ${round.slotCount} placements for ${round.id}.`);
  }
  const player = stableFormation(attacker);
  const enemy = stableFormation(defender).map((placement) => ({ ...placement, cell: mirrorDefenseCell(placement.cell) }));
  const attackerUnits = sideUnits(player.map((entry) => entry.summon), 'player', player.map((entry) => entry.cell), round.id);
  const defenderUnits = sideUnits(enemy.map((entry) => entry.summon), 'enemy', enemy.map((entry) => entry.cell), round.id);
  return { battleId: `${raidId}:${round.id}`, mode: 'raid', units: [...attackerUnits, ...defenderUnits] };
}

export function combatWinnerToRaidOutcome(winner: 'player' | 'enemy' | 'draw' | null): RaidOutcome {
  return winner === 'player' ? 'win' : winner === 'enemy' ? 'loss' : 'draw';
}

export function resolveRaidOutcome(rounds: readonly Pick<RaidRoundResult, 'outcome'>[]): RaidOutcome {
  const wins = rounds.filter((round) => round.outcome === 'win').length;
  const losses = rounds.filter((round) => round.outcome === 'loss').length;
  return wins === losses ? 'draw' : wins > losses ? 'win' : 'loss';
}

export type RaidSimulationOptions = { transformSnapshot?: (snapshot: CombatSnapshot, round: RaidRoundDefinition) => CombatSnapshot };

export function simulateRaidRound(
  attacker: RaidSummonSnapshot[],
  defender: RaidSummonSnapshot[],
  rootSeed: RaidSeed,
  raidId: string,
  round: RaidRoundDefinition,
  options: RaidSimulationOptions = {}
): RaidRoundResult {
  const seed = deriveRoundSeed(rootSeed, round.id);
  const input = buildRaidRoundSnapshotFromSummons(attacker, defender, round, raidId);
  const combatSnapshot = options.transformSnapshot ? options.transformSnapshot(structuredClone(input), round) : input;
  const state = runCombatAutoCast(combatSnapshot, seedToNumber(seed));
  return { roundId: round.id, roundSize: round.slotCount, seed, outcome: combatWinnerToRaidOutcome(state.winner), combatSnapshot, events: structuredClone(state.events) };
}

export function simulateRaidRoundFromPlacements(
  attacker: readonly RaidFormationPlacement[],
  defender: readonly RaidFormationPlacement[],
  rootSeed: RaidSeed,
  raidId: string,
  round: RaidRoundDefinition,
  options: RaidSimulationOptions = {}
): RaidRoundResult {
  const seed = deriveRoundSeed(rootSeed, round.id);
  const input = buildRaidRoundSnapshotFromPlacements(attacker, defender, round, raidId);
  const combatSnapshot = options.transformSnapshot ? options.transformSnapshot(structuredClone(input), round) : input;
  const state = runCombatAutoCast(combatSnapshot, seedToNumber(seed));
  return { roundId: round.id, roundSize: round.slotCount, seed, outcome: combatWinnerToRaidOutcome(state.winner), combatSnapshot, events: structuredClone(state.events) };
}

export function simulateRaid(
  attacker: RaidCanonicalSquad,
  defender: RaidCanonicalSquad,
  rootSeed: RaidSeed,
  raidId: string,
  options: RaidSimulationOptions = {}
): { rounds: RaidRoundResult[]; outcome: RaidOutcome } {
  const rounds = RAID_ROUND_DEFINITIONS.map((round) =>
    simulateRaidRound(roundSquad(attacker, round.id), roundSquad(defender, round.id), rootSeed, raidId, round, options)
  );
  return { rounds, outcome: resolveRaidOutcome(rounds) };
}
