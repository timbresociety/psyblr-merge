import type { CameraComponent } from 'playcanvas';
import { Vec3 } from 'playcanvas';
import { BASE_WORLD_TARGETS, campCellToWorld } from './baseLayout';

export type WorldTargetRect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
export const WORLD_TARGETS_EVENT = 'psyblr:world-target-rects';
export const CAMP_CELL_CENTERS_EVENT = 'psyblr:camp-cell-screen-centers';

export function projectBaseWorldTargets(camera: CameraComponent, canvas: HTMLCanvasElement): Record<string, WorldTargetRect> {
  const bounds = canvas.getBoundingClientRect();
  const result: Record<string, WorldTargetRect> = {};
  for (const [id, target] of Object.entries(BASE_WORLD_TARGETS)) {
    const points: Vec3[] = [];
    for (const x of [target.min[0], target.max[0]]) for (const y of [target.min[1], target.max[1] + 1.4]) for (const z of [target.min[2], target.max[2]]) points.push(camera.worldToScreen(new Vec3(x, y, z)));
    const scaleX = bounds.width / canvas.width; const scaleY = bounds.height / canvas.height;
    const rawLeft = Math.min(...points.map((point) => bounds.left + point.x * scaleX)) - target.padding * 8;
    const rawRight = Math.max(...points.map((point) => bounds.left + point.x * scaleX)) + target.padding * 8;
    const rawTop = Math.min(...points.map((point) => bounds.top + point.y * scaleY)) - target.padding * 8;
    const rawBottom = Math.max(...points.map((point) => bounds.top + point.y * scaleY)) + target.padding * 8;
    const left = Math.max(bounds.left, rawLeft); const right = Math.min(bounds.right, rawRight); const top = Math.max(bounds.top, rawTop); const bottom = Math.min(bounds.bottom, rawBottom);
    result[id] = { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }
  return result;
}

export function publishBaseWorldTargets(camera: CameraComponent, canvas: HTMLCanvasElement) {
  window.dispatchEvent(new CustomEvent<Record<string, WorldTargetRect>>(WORLD_TARGETS_EVENT, { detail: projectBaseWorldTargets(camera, canvas) }));
  const bounds = canvas.getBoundingClientRect(); const scaleX = bounds.width / canvas.width; const scaleY = bounds.height / canvas.height;
  const centers = Array.from({ length: 36 }, (_, index) => { const x = index % 6; const y = Math.floor(index / 6); const [worldX, worldY, worldZ] = campCellToWorld({ x, y }); const point = camera.worldToScreen(new Vec3(worldX, worldY + .18, worldZ)); return { x, y, clientX: bounds.left + point.x * scaleX, clientY: bounds.top + point.y * scaleY }; });
  window.dispatchEvent(new CustomEvent(CAMP_CELL_CENTERS_EVENT, { detail: centers }));
}
