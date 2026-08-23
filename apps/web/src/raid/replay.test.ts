import { describe, expect, it } from 'vitest';
import { applyRaidEvents } from './replay';

describe('Raid replay event adapter', () => {
  it('reconstructs movement, damage, shields and death from returned events', () => {
    const units = { a: { id: 'a', hp: 100, maxHp: 100, x: 0, z: 0, dead: false, shield: 0 }, b: { id: 'b', hp: 100, maxHp: 100, x: 1000, z: 0, dead: false, shield: 0 } };
    const replayed = applyRaidEvents(units, [
      { tick: 1, type: 'move', actorId: 'a', targetId: 'b', payload: { x: 400, z: 0 } },
      { tick: 2, type: 'shield_changed', actorId: 'a', targetId: 'b', payload: { shield: 20 } },
      { tick: 3, type: 'damage', actorId: 'a', targetId: 'b', payload: { remainingHp: 0 } },
      { tick: 3, type: 'death', actorId: 'b', targetId: null, payload: {} },
    ]);
    expect(replayed.a!.x).toBe(400); expect(replayed.b).toMatchObject({ hp: 0, shield: 20, dead: true });
  });
});
