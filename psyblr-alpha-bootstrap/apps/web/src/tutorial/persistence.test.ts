import { describe, expect, it } from 'vitest';
import { migrateTutorialCheckpoint } from './persistence';

const v1 = { schemaVersion: 1, tutorialVersion: 1, currentStepId: 'base_intro', completedStepIds: ['campaign_complete'], context: { firstSummonInstanceId: 'starter:goku:001' }, inventory: [], placements: [], battle: null };
describe('tutorial checkpoint migration', () => {
  it('migrates valid PR04 checkpoints without discarding campaign state', () => {
    expect(migrateTutorialCheckpoint(v1)).toEqual({ ...v1, schemaVersion: 2, campPlacements: [] });
  });
  it('round trips a v2 base checkpoint and rejects corrupt state', () => {
    const v2 = { ...v1, schemaVersion: 2 as const, campPlacements: [{ summonInstanceId: 'starter:goku:001', cell: { x: 0, y: 0 } }] };
    expect(migrateTutorialCheckpoint(v2)).toEqual(v2);
    expect(migrateTutorialCheckpoint({ schemaVersion: 2 })).toBeNull();
  });
});
