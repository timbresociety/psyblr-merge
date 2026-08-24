import { describe, it, expect } from 'vitest';
import type { CampPlacement, SummonInstance } from '@psyblr/contracts';
import { canPlaceCampSummon, moveCampSummon, isCampCellOccupied } from '@psyblr/game-rules';

describe('BattleCampDock and Multi-Summon Placements', () => {
  const roster: SummonInstance[] = [
    { id: 'starter:goku:001', definitionId: 'goku', tier: 'F' },
    { id: 'starter:naruto:002', definitionId: 'naruto', tier: 'F' },
    { id: 'starter:luffy:003', definitionId: 'luffy', tier: 'F' },
    { id: 'starter:eren:004', definitionId: 'eren', tier: 'F' },
    { id: 'starter:l:005', definitionId: 'l', tier: 'F' },
    { id: 'starter:lelouch:006', definitionId: 'lelouch', tier: 'F' },
  ];

  it('correctly tracks roster and active camp placements', () => {
    const placements: CampPlacement[] = [
      { summonInstanceId: 'starter:goku:001', cell: { x: 2, y: 3 } },
      { summonInstanceId: 'starter:naruto:002', cell: { x: 3, y: 3 } },
      { summonInstanceId: 'starter:luffy:003', cell: { x: 1, y: 2 } },
      { summonInstanceId: 'starter:eren:004', cell: { x: 4, y: 2 } },
    ];

    expect(placements.length).toBe(4);
    expect(isCampCellOccupied({ x: 2, y: 3 }, placements)).toBe(true);
    expect(isCampCellOccupied({ x: 0, y: 0 }, placements)).toBe(false);
  });

  it('allows moving summon to an empty camp cell', () => {
    let placements: CampPlacement[] = [
      { summonInstanceId: 'starter:goku:001', cell: { x: 2, y: 3 } },
      { summonInstanceId: 'starter:naruto:002', cell: { x: 3, y: 3 } },
    ];

    expect(canPlaceCampSummon('starter:goku:001', { x: 0, y: 1 }, placements)).toBe(true);
    placements = moveCampSummon('starter:goku:001', { x: 0, y: 1 }, placements);

    const gokuPlacement = placements.find((p) => p.summonInstanceId === 'starter:goku:001');
    expect(gokuPlacement?.cell).toEqual({ x: 0, y: 1 });
  });

  it('correctly executes multi-summon swap resolution', () => {
    let placements: CampPlacement[] = [
      { summonInstanceId: 'starter:goku:001', cell: { x: 2, y: 3 } },
      { summonInstanceId: 'starter:naruto:002', cell: { x: 3, y: 3 } },
    ];

    // Dragging Goku from (2, 3) to Naruto's cell (3, 3) executes swap
    const summonAId = 'starter:goku:001';
    const fromCell = { x: 2, y: 3 };
    const toCell = { x: 3, y: 3 };

    const existingOccupant = placements.find(
      (p) => p.summonInstanceId !== summonAId && p.cell.x === toCell.x && p.cell.y === toCell.y
    );
    expect(existingOccupant?.summonInstanceId).toBe('starter:naruto:002');

    // Perform swap
    placements = placements.map((p) => {
      if (p.summonInstanceId === summonAId) return { ...p, cell: { ...toCell } };
      if (p.summonInstanceId === existingOccupant?.summonInstanceId) return { ...p, cell: { ...fromCell } };
      return p;
    });

    const gokuPos = placements.find((p) => p.summonInstanceId === 'starter:goku:001')?.cell;
    const narutoPos = placements.find((p) => p.summonInstanceId === 'starter:naruto:002')?.cell;

    expect(gokuPos).toEqual({ x: 3, y: 3 });
    expect(narutoPos).toEqual({ x: 2, y: 3 });
  });
});
