import { baseLayoutDefinition } from '@psyblr/game-content';
import type { CampCell } from '@psyblr/contracts';
import { isCampCell } from '@psyblr/game-rules';

export const BASE_LAYOUT = baseLayoutDefinition;
export const CAMP_SIZE = 6;

export type BaseWorldPoint = { x: number; z: number };

export function campCellToWorld(cell: CampCell): [number, number, number] {
  const { origin, cellSize } = BASE_LAYOUT.camp;
  return [
    origin[0] + (cell.x - (CAMP_SIZE - 1) / 2) * cellSize,
    origin[1],
    origin[2] + (cell.y - (CAMP_SIZE - 1) / 2) * cellSize,
  ];
}

export function worldToCampCell(point: BaseWorldPoint): CampCell | null {
  const { origin, cellSize } = BASE_LAYOUT.camp;
  const x = Math.floor((point.x - origin[0] + CAMP_SIZE * cellSize / 2) / cellSize);
  const y = Math.floor((point.z - origin[2] + CAMP_SIZE * cellSize / 2) / cellSize);
  return isCampCell({ x, y }) ? { x, y } : null;
}

export function worldToBuildingSocket(point: BaseWorldPoint, kind: 'spawn_machine' | 'raid_gate'): string | null {
  const socket = BASE_LAYOUT.buildingSockets.find((entry) => entry.kind === kind);
  if (!socket) return null;
  const [x, , z] = socket.position; const [width, depth] = socket.footprint;
  return Math.abs(point.x - x) <= width / 2 && Math.abs(point.z - z) <= depth / 2 ? socket.id : null;
}

export const BASE_WORLD_TARGETS = {
  'camp-grid': { min: campCellToWorld({ x: 0, y: 0 }), max: campCellToWorld({ x: 5, y: 5 }), padding: 0.65 },
  'illuminati-row': { min: campCellToWorld({ x: 0, y: 0 }), max: campCellToWorld({ x: 5, y: 0 }), padding: 0.65 },
  'spawn-machine': { min: [5.1, 0, -1.3] as [number, number, number], max: [7.7, 2.8, 1.3] as [number, number, number], padding: 0.2 },
  'raid-gate': { min: [-7.7, 0, -1.3] as [number, number, number], max: [-5.1, 3.3, 1.3] as [number, number, number], padding: 0.2 },
} as const;
