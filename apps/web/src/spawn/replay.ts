import type { SpawnReplayDescriptor } from '@psyblr/contracts';
export type ReplayPoint = { x: number; y: number };
function hash(text: string) { let value = 2166136261; for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return value >>> 0; }
/** Presentation-only route; its terminal bin is always supplied by authority. */
export function createSpawnReplayPath(replay: SpawnReplayDescriptor): ReplayPoint[] {
  let seed = hash(replay.presentationSeed); const random = () => { seed = Math.imul(seed ^ (seed >>> 15), 2246822519) >>> 0; return seed / 2 ** 32; };
  const points: ReplayPoint[] = [{ x: .5, y: 1 }];
  for (let index = 1; index <= 8; index += 1) points.push({ x: Math.max(.06, Math.min(.94, .5 + (random() - .5) * .62)), y: 1 - index / 10 });
  points.push({ x: (replay.rewardSlot + .5) / 6, y: 0 }); return points;
}
