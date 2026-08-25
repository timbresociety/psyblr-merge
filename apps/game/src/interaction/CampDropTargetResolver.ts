import type { CampCell, CampPlacement } from '@psyblr/contracts';
import { isCampCell, CAMP_SIZE } from '@psyblr/game-rules';
import {
  CAMP_CELL_SIZE,
  CAMP_ORIGIN,
  campCellToWorld,
  type WorldPoint,
} from '../world/CampCoordinateMapper';

export interface TacticalDropResult {
  cell: { x: number; z: number };
  worldPos: [number, number, number];
  isValidPlayerZone: boolean; // true if z >= 4 (player side of 8x8 board)
  isOccupied: boolean;
  occupantId?: string;
  isSwap: boolean;
  isRecall: boolean;
}

export class CampDropTargetResolver {
  /**
   * Resolves the closest valid CampCell for a pointer ground position using magnetic snapping.
   *
   * @param groundPoint Current pointer position on the ground plane in world space
   * @param summonInstanceId The instance ID of the dragged summon
   * @param placements Current active camp placements
   * @param magneticRadiusPadding Extra radius tolerance for magnetic snap around camp edges
   */
  resolveDropTarget(
    groundPoint: WorldPoint,
    summonInstanceId: string,
    placements: readonly CampPlacement[],
    magneticRadiusPadding: number = 0.5
  ): CampCell | null {
    const halfGrid = (CAMP_SIZE * CAMP_CELL_SIZE) / 2; // 3.75

    // Check if within camp area + magnetic margin
    const minX = CAMP_ORIGIN[0] - halfGrid - magneticRadiusPadding;
    const maxX = CAMP_ORIGIN[0] + halfGrid + magneticRadiusPadding;
    const minZ = CAMP_ORIGIN[2] - halfGrid - magneticRadiusPadding;
    const maxZ = CAMP_ORIGIN[2] + halfGrid + magneticRadiusPadding;

    if (
      groundPoint.x < minX ||
      groundPoint.x > maxX ||
      groundPoint.z < minZ ||
      groundPoint.z > maxZ
    ) {
      return null;
    }

    // Find nearest cell by calculating continuous grid coordinate and rounding
    const localX = groundPoint.x - CAMP_ORIGIN[0] + halfGrid;
    const localZ = groundPoint.z - CAMP_ORIGIN[2] + halfGrid;

    // Fractional cell coordinates
    const fracX = localX / CAMP_CELL_SIZE;
    const fracY = localZ / CAMP_CELL_SIZE;

    // Nearest integer cell
    let cellX = Math.floor(fracX);
    let cellY = Math.floor(fracY);

    // Clamp to valid 6x6 grid range
    cellX = Math.max(0, Math.min(CAMP_SIZE - 1, cellX));
    cellY = Math.max(0, Math.min(CAMP_SIZE - 1, cellY));

    const candidateCell: CampCell = { x: cellX, y: cellY };

    if (!isCampCell(candidateCell)) {
      return null;
    }

    return candidateCell;
  }

  /**
   * Resolves tactical drop target for Campaign or Raid 8x8 tactical battlefields.
   * Player deployment territory is the bottom half (z >= 4, rows 4..7, cols 0..7).
   */
  resolveTacticalDropTarget(
    groundPoint: WorldPoint,
    mode: 'campaign' | 'raid',
    currentPlacements: readonly { summonId: string; cell: { x: number; z: number } }[],
    draggedSummonId?: string
  ): TacticalDropResult | null {
    const [originX, , originZ] = mode === 'campaign' ? [0, 0, -40] : [-40, 0, 0];
    const size = 8;
    const cellSize = 1.0;
    const halfSpan = (size - 1) / 2; // 3.5

    const localX = groundPoint.x - (originX ?? 0);
    const localZ = groundPoint.z - (originZ ?? 0);

    // Check if dragged down towards bottom screen / tray (recall zone)
    if (localZ > 4.6) {
      return {
        cell: { x: 0, z: 8 },
        worldPos: [groundPoint.x, 0.05, groundPoint.z],
        isValidPlayerZone: false,
        isOccupied: false,
        isSwap: false,
        isRecall: true,
      };
    }

    const continuousX = localX / cellSize + halfSpan;
    const continuousZ = localZ / cellSize + halfSpan;

    // Nearest integer cell
    const cellX = Math.round(continuousX);
    const cellZ = Math.round(continuousZ);

    if (cellX < 0 || cellX >= size || cellZ < 0 || cellZ >= size) {
      return null;
    }

    const isValidPlayerZone = cellZ >= 4;
    const occupant = currentPlacements.find(
      (p) => p.cell.x === cellX && p.cell.z === cellZ && p.summonId !== draggedSummonId
    );
    const isOccupied = occupant !== undefined;
    const isSwap = isOccupied && isValidPlayerZone;

    const worldX = (cellX - halfSpan) * cellSize + (originX ?? 0);
    const worldZ = (cellZ - halfSpan) * cellSize + (originZ ?? 0);

    const result: TacticalDropResult = {
      cell: { x: cellX, z: cellZ },
      worldPos: [worldX, 0.05, worldZ],
      isValidPlayerZone,
      isOccupied,
      isSwap,
      isRecall: false,
    };
    if (occupant) {
      result.occupantId = occupant.summonId;
    }
    return result;
  }

  /**
   * Distance between a world point and the center of a camp cell.
   */
  getDistanceToCell(groundPoint: WorldPoint, cell: CampCell): number {
    const cellWorld = campCellToWorld(cell);
    const dx = groundPoint.x - cellWorld[0];
    const dz = groundPoint.z - cellWorld[2];
    return Math.sqrt(dx * dx + dz * dz);
  }
}
