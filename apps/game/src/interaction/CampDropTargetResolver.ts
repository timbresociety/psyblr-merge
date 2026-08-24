import type { CampCell, CampPlacement } from '@psyblr/contracts';
import { isCampCell, CAMP_SIZE } from '@psyblr/game-rules';
import {
  CAMP_CELL_SIZE,
  CAMP_ORIGIN,
  campCellToWorld,
  type WorldPoint,
} from '../world/CampCoordinateMapper';

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
   * Distance between a world point and the center of a camp cell.
   */
  getDistanceToCell(groundPoint: WorldPoint, cell: CampCell): number {
    const cellWorld = campCellToWorld(cell);
    const dx = groundPoint.x - cellWorld[0];
    const dz = groundPoint.z - cellWorld[2];
    return Math.sqrt(dx * dx + dz * dz);
  }
}
