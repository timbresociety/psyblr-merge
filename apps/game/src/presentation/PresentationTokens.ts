/**
 * Centralized presentation tokens for PSYBLR V2.
 * Consistent timings, easings, and visual constants across all entities and UI.
 */

export const DURATION = {
  MICRO: 0.11,     // 110ms - Instant micro-feedbacks (hover ticks, ring flashes)
  QUICK: 0.20,     // 200ms - Snappy interactions (pickup lift, cell hover switch)
  STANDARD: 0.32,  // 320ms - Standard drops and primary physical actions
  FOCUS: 0.52,     // 520ms - Settle, return transitions
  REWARD: 0.85,    // 850ms - Celebration, milestone pulses
  HERO: 1.60,      // 1600ms - Major camera transitions, cinematic reveals
} as const;

export type DurationToken = keyof typeof DURATION;

export type EasingFunction = (t: number) => number;

export const EASING = {
  // Linear
  LINEAR: (t: number) => t,

  // Snappy start with soft deceleration
  SNAP: (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - clamped, 3);
  },

  // Authoritative physical impact landing with slight bounce/overshoot
  LAND: (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    if (clamped === 1) return 1;
    // Damped harmonic overshoot
    const p = 0.35;
    return Math.pow(2, -10 * clamped) * Math.sin(((clamped - p / 4) * (2 * Math.PI)) / p) + 1;
  },

  // Smooth floating / breathing cycle
  FLOAT: (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    return (1 - Math.cos(clamped * Math.PI)) / 2;
  },

  // Elastic spring return
  SPRING: (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    const c4 = (2 * Math.PI) / 3;
    return clamped === 0
      ? 0
      : clamped === 1
      ? 1
      : Math.pow(2, -10 * clamped) * Math.sin((clamped * 10 - 0.75) * c4) + 1;
  },

  // Cinematic ease in-out
  CINEMATIC: (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped < 0.5
      ? 4 * clamped * clamped * clamped
      : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
  },
} as const;

export type EasingToken = keyof typeof EASING;
