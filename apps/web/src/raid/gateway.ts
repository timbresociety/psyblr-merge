import { GAME_CONTENT_VERSION } from '@psyblr/game-content';
import { RaidRoundResolutionSchema, StartRaidRoundRequestSchema, type RaidFormationPlacement, type RaidRoundDefinition, type RaidRoundResolution, type RaidSummonSnapshot, type StartRaidRoundRequest } from '@psyblr/contracts';
import { getRaidRoundDefinition } from '@psyblr/game-rules';
import { simulateRaidRoundFromPlacements } from '@psyblr/raid-core';

export interface RaidAuthority { resolveRound(request: StartRaidRoundRequest): Promise<RaidRoundResolution>; }
export interface RaidOpponentProvider { selectTutorialOpponent(round: RaidRoundDefinition, attacker: readonly RaidSummonSnapshot[]): { id: string; displayName: string; defender: RaidSummonSnapshot[] }; }

/** Tutorial matchmaking is deliberately authority-shaped: it owns the defender and tuning, never the UI. */
export const tutorialOpponentProvider: RaidOpponentProvider = {
  selectTutorialOpponent(round, attacker) {
    const defender = attacker.map((summon, index) => ({ ...summon, instanceId: `tutorial-defender:${round.id}:${index}:${summon.definitionId}` }));
    return { id: 'tutorial-warden', displayName: 'Raid Warden', defender };
  },
};
function tutorialDefensePlacements(round: RaidRoundDefinition, defender: readonly RaidSummonSnapshot[]): RaidFormationPlacement[] {
  // Stored in player-normalized space. raid-core mirrors z for the defending side.
  const rows = round.slotCount === 2 ? [{ x: 2, z: 6 }, { x: 5, z: 6 }] : round.slotCount === 4 ? [{ x: 2, z: 5 }, { x: 5, z: 5 }, { x: 2, z: 6 }, { x: 5, z: 6 }] : [{ x: 1, z: 5 }, { x: 3, z: 5 }, { x: 5, z: 5 }, { x: 2, z: 6 }, { x: 4, z: 6 }, { x: 6, z: 6 }];
  return defender.map((summon, index) => ({ summon, cell: rows[index]! }));
}
function tutorialTransform(snapshot: import('@psyblr/contracts').CombatSnapshot, round: RaidRoundDefinition) {
  // Tutorial fields are a guided flow, not a gear check. Keep every Warden
  // formation weak so all three rounds resolve quickly and cannot block the
  // path to opponent-camp testing.
  return { ...snapshot, units: snapshot.units.map((unit) => unit.side === 'enemy'
    ? { ...unit, hp: 25, atk: 1, def: 0, attacksPerSecond: .5, skill1Id: null, skill1: null }
    : unit) };
}
export function createTutorialRaidGateway(provider: RaidOpponentProvider = tutorialOpponentProvider): RaidAuthority {
  const completed = new Map<string, RaidRoundResolution>();
  return {
    async resolveRound(rawRequest) {
      const request = StartRaidRoundRequestSchema.parse(rawRequest);
      const existing = completed.get(request.clientActionId);
      if (existing) return structuredClone(existing);
      if (request.contentVersion !== GAME_CONTENT_VERSION) throw new Error('Your Raid formation is out of date. Retry after refreshing.');
      const round = getRaidRoundDefinition(request.roundId);
      const opponent = provider.selectTutorialOpponent(round, request.attacker);
      const defenderPlacements = tutorialDefensePlacements(round, opponent.defender);
      const result = simulateRaidRoundFromPlacements(request.attackerPlacements, defenderPlacements, request.rootSeed, request.raidId, round, { transformSnapshot: tutorialTransform });
      const parsed = RaidRoundResolutionSchema.parse({ raidId: request.raidId, clientActionId: request.clientActionId, contentVersion: request.contentVersion, rootSeed: request.rootSeed, opponent: { id: opponent.id, displayName: opponent.displayName, kind: 'tutorial' }, attacker: request.attacker, defender: opponent.defender, attackerPlacements: request.attackerPlacements, defenderPlacements, round: result });
      completed.set(request.clientActionId, parsed);
      return structuredClone(parsed);
    },
  };
}

export const tutorialRaidGateway = createTutorialRaidGateway();
