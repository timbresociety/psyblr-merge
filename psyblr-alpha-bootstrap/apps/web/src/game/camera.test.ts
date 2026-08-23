import { describe, expect, it } from 'vitest';
import { CAMERA_PRESETS, nextCameraPreset } from './camera';

describe('camera presets', () => {
  it('defines stable Campaign and Base preset ids', () => {
    expect(CAMERA_PRESETS.campaign_overview.fov).toBeGreaterThan(0);
    expect(CAMERA_PRESETS.base_reveal.durationMs).toBeGreaterThan(0);
    expect(nextCameraPreset('base_reveal')).toBe('base_overview');
    expect(nextCameraPreset('base_overview')).toBeNull();
  });
});
