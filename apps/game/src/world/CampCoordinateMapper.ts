import type { CampCell } from '@psyblr/contracts';
import { isCampCell, CAMP_SIZE } from '@psyblr/game-rules';
import { baseLayoutDefinition } from '@psyblr/game-content';

export const CAMP_CELL_SIZE = baseLayoutDefinition.camp.cellSize; // 1.25
export const CAMP_ORIGIN = baseLayoutDefinition.camp.origin; // [0, 0, 0]

export type WorldPoint = { x: number; z: number };

/**
 * Converts a logical CampCell (x: 0..5, y: 0..5) to exact 3D world coordinates [x, y, z].
 */
export function campCellToWorld(cell: CampCell): [number, number, number] {
  const halfSpan = (CAMP_SIZE - 1) / 2; // 2.5
  return [
    CAMP_ORIGIN[0] + (cell.x - halfSpan) * CAMP_CELL_SIZE,
    CAMP_ORIGIN[1],
    CAMP_ORIGIN[2] + (cell.y - halfSpan) * CAMP_CELL_SIZE,
  ];
}

/**
 * Converts a 2D ground point in world space to its containing CampCell, if within bounds.
 */
export function worldToCampCell(point: WorldPoint): CampCell | null {
  const halfGrid = (CAMP_SIZE * CAMP_CELL_SIZE) / 2; // 3.75
  const localX = point.x - CAMP_ORIGIN[0] + halfGrid;
  const localZ = point.z - CAMP_ORIGIN[2] + halfGrid;

  const cellX = Math.floor(localX / CAMP_CELL_SIZE);
  const cellY = Math.floor(localZ / CAMP_CELL_SIZE);

  if (isCampCell({ x: cellX, y: cellY })) {
    return { x: cellX, y: cellY };
  }
  return null;
}

/**
 * Calculates the bounding box in world coordinates for the entire 6x6 camp.
 */
export function getCampWorldBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const halfGrid = (CAMP_SIZE * CAMP_CELL_SIZE) / 2; // 3.75
  return {
    minX: CAMP_ORIGIN[0] - halfGrid,
    maxX: CAMP_ORIGIN[0] + halfGrid,
    minZ: CAMP_ORIGIN[2] - halfGrid,
    maxZ: CAMP_ORIGIN[2] + halfGrid,
  };
}
