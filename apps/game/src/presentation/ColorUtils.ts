import { Color } from 'playcanvas';

/**
 * Converts a hex color string (e.g. '#f59e0b', '#38bdf8', '#fff') to a PlayCanvas Color instance.
 */
export function colorFromHex(hex: string, alpha: number = 1.0): Color {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return new Color(r, g, b, alpha);
  } else if (clean.length === 3) {
    const r = parseInt(clean[0]! + clean[0]!, 16) / 255;
    const g = parseInt(clean[1]! + clean[1]!, 16) / 255;
    const b = parseInt(clean[2]! + clean[2]!, 16) / 255;
    return new Color(r, g, b, alpha);
  }
  return new Color(1, 1, 1, alpha);
}
