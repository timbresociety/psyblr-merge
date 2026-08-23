import type { BattleCell } from '@psyblr/contracts';

export const BOARD_SIZE = 8;
export const BATTLE_CELL_SIZE = 1.25;
export const BOARD_HALF_EXTENT = BOARD_SIZE * BATTLE_CELL_SIZE / 2;

export type BattleWorldPoint = { x: number; z: number };

export function battleCellToWorld(cell: BattleCell): [number, number, number] {
  return [
    (cell.x - (BOARD_SIZE - 1) / 2) * BATTLE_CELL_SIZE,
    0,
    (cell.z - (BOARD_SIZE - 1) / 2) * BATTLE_CELL_SIZE,
  ];
}

export function worldToBattleCell(point: BattleWorldPoint): BattleCell | null {
  const x = Math.floor((point.x + BOARD_HALF_EXTENT) / BATTLE_CELL_SIZE);
  const z = Math.floor((point.z + BOARD_HALF_EXTENT) / BATTLE_CELL_SIZE);
  if (x < 0 || x >= BOARD_SIZE || z < 0 || z >= BOARD_SIZE) return null;
  return { x, z };
}

export function sameBattleCell(a: BattleCell | null, b: BattleCell | null): boolean {
  return a?.x === b?.x && a?.z === b?.z;
}
