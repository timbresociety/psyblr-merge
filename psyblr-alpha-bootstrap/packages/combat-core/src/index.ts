export type Side = 'A' | 'B';
export type FighterSnapshot = { id:string; side:Side; hp:number; atk:number; attacksPerSecond:number };
export type SimEvent = { tick:number; type:'damage'|'death'|'round_end'; actorId?:string; targetId?:string; amount?:number; winner?:Side|'draw' };

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Minimal deterministic scaffold. PR03 replaces this with targeting, movement, cooldowns and skills.
export function simulateRound(input: { fighters:FighterSnapshot[]; seed:number; maxTicks?:number }): SimEvent[] {
  const maxTicks = input.maxTicks ?? 600;
  const rng = mulberry32(input.seed);
  const hp = new Map(input.fighters.map(f => [f.id, f.hp]));
  const bySide = (s:Side) => input.fighters.filter(f => f.side === s && (hp.get(f.id) ?? 0) > 0);
  const events: SimEvent[] = [];
  for (let tick=0; tick<maxTicks; tick++) {
    const a = bySide('A'); const b = bySide('B');
    if (!a.length || !b.length) {
      events.push({tick,type:'round_end',winner: a.length === b.length ? 'draw' : a.length ? 'A' : 'B'});
      return events;
    }
    if (tick % 30 !== 0) continue;
    for (const attacker of [...a, ...b]) {
      const targets = bySide(attacker.side === 'A' ? 'B' : 'A');
      if (!targets.length) break;
      const target = targets[Math.floor(rng() * targets.length)]!;
      const amount = Math.max(1, Math.round(attacker.atk * (0.9 + rng()*0.2)));
      const remaining = Math.max(0, (hp.get(target.id) ?? 0) - amount);
      hp.set(target.id, remaining);
      events.push({tick,type:'damage',actorId:attacker.id,targetId:target.id,amount});
      if (remaining === 0) events.push({tick,type:'death',actorId:target.id});
    }
  }
  events.push({tick:maxTicks,type:'round_end',winner:'draw'});
  return events;
}
