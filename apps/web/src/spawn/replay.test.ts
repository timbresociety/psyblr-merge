import { describe, expect, it } from 'vitest';
import { createSpawnReplayPath } from './replay';
describe('spawn replay', () => it('is deterministic and ends at its authority-selected bin', () => { const descriptor = { replayId: 'a', rewardSlot: 4, presentationSeed: 'seed' }; expect(createSpawnReplayPath(descriptor)).toEqual(createSpawnReplayPath(descriptor)); expect(createSpawnReplayPath(descriptor).at(-1)).toEqual({ x: 4.5 / 6, y: 0 }); }));
