import { describe, expect, it } from 'vitest';
import { migrateTutorialCheckpoint } from './persistence';
import { createTutorialSpawnRuntime } from '../spawn/gateway';
import { createEmptyRaidSquadDraft } from '@psyblr/game-rules';

const v1 = { schemaVersion: 1, tutorialVersion: 1, currentStepId: 'base_intro', completedStepIds: ['campaign_complete'], context: { firstSummonInstanceId: 'starter:goku:001' }, inventory: [], placements: [], battle: null };
describe('tutorial checkpoint migration', () => {
  it('migrates valid PR04 checkpoints without discarding campaign state', () => {
    expect(migrateTutorialCheckpoint(v1)).toEqual({ ...v1, schemaVersion: 5, campPlacements: [], spawn: createTutorialSpawnRuntime(), merge: { appliedActionIds: [] }, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null });
  });
  it('round trips a v2 base checkpoint and rejects corrupt state', () => {
    const v2 = { ...v1, schemaVersion: 2 as const, campPlacements: [{ summonInstanceId: 'starter:goku:001', cell: { x: 0, y: 0 } }] };
    expect(migrateTutorialCheckpoint(v2)).toEqual({ ...v2, schemaVersion: 5, spawn: createTutorialSpawnRuntime(), merge: { appliedActionIds: [] }, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null });
    expect(migrateTutorialCheckpoint({ schemaVersion: 2 })).toBeNull();
  });
  it('migrates PR06 checkpoints while preserving the complete Spawn runtime', () => {
    const v3 = { ...v1, schemaVersion: 3 as const, campPlacements: [], spawn: createTutorialSpawnRuntime() };
    expect(migrateTutorialCheckpoint(v3)).toEqual({ ...v3, schemaVersion: 5, merge: { appliedActionIds: [] }, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null });
  });
  it('migrates v4 and retains raid state in a v5 round trip', () => {
    const v4 = { ...v1, schemaVersion: 4 as const, campPlacements: [], spawn: createTutorialSpawnRuntime(), merge: { appliedActionIds: [] } };
    expect(migrateTutorialCheckpoint(v4)).toEqual({ ...v4, schemaVersion: 5, raidDraft: createEmptyRaidSquadDraft(), raidSnapshot: null });
    const v5 = { ...v4, schemaVersion: 5 as const, raidDraft: { round1: ['starter:goku:001'], round2: [null, null, null], round3: [null, null, null, null, null, null] }, raidSnapshot: null };
    expect(migrateTutorialCheckpoint(v5)).toEqual(v5);
  });
});
