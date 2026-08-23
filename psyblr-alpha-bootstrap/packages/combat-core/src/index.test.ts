import { describe, expect, it } from 'vitest';
import { simulateRound } from './index';

describe('combat determinism', () => {
  it('returns identical logs for identical snapshot + seed', () => {
    const input = { seed:42, fighters:[
      {id:'a',side:'A' as const,hp:100,atk:12,attacksPerSecond:1},
      {id:'b',side:'B' as const,hp:100,atk:12,attacksPerSecond:1}
    ]};
    expect(simulateRound(input)).toEqual(simulateRound(input));
  });
});
