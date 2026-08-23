export type CameraPresetId = 'campaign_overview' | 'base_reveal' | 'base_overview' | 'spawn_focus';
export type CameraPreset = { position: [number, number, number]; rotation: [number, number, number]; fov: number; durationMs: number };

export const CAMERA_PRESETS: Readonly<Record<CameraPresetId, CameraPreset>> = {
  campaign_overview: { position: [0, 9, 11], rotation: [-40, 0, 0], fov: 42, durationMs: 450 },
  base_reveal: { position: [0, 15, 17], rotation: [-40, 0, 0], fov: 48, durationMs: 450 },
  base_overview: { position: [0, 10.8, 12.5], rotation: [-42, 0, 0], fov: 42, durationMs: 1100 },
  spawn_focus: { position: [6.4, 6.6, 9.2], rotation: [-32, -28, 0], fov: 38, durationMs: 700 },
};

export function nextCameraPreset(preset: CameraPresetId): CameraPresetId | null {
  return preset === 'base_reveal' ? 'base_overview' : null;
}

export function easeInOutCubic(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t < .5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}
