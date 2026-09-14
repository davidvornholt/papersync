/**
 * Motion scale shared by every animated component. Durations are seconds
 * for `motion`; the same values live in `theme.css` for CSS transitions.
 */
const quickSeconds = 0.15;
const fastSeconds = 0.25;
const mediumSeconds = 0.35;
const slowSeconds = 0.4;
const verySlowSeconds = 0.5;
const staggerSeconds = 0.04;

export const duration = {
  /** Modal or dropdown close, text swap. */
  quick: quickSeconds,
  /** Icon swap, modal open, tabs, page slide. */
  fast: fastSeconds,
  /** Panel or toast close. */
  medium: mediumSeconds,
  /** Panel open, skeleton reveal. */
  slow: slowSeconds,
  /** Emphasis moments: success, reveals. */
  verySlow: verySlowSeconds,
  /** Per-item stagger offset. */
  stagger: staggerSeconds,
} as const;

const smoothOutX1 = 0.22;
const smoothOutY1 = 1;
const smoothOutX2 = 0.36;
const smoothOutY2 = 1;
const bounceX1 = 0.34;
const bounceY1 = 1.36;
const bounceX2 = 0.64;
const bounceY2 = 1;

export const ease = {
  /** Opens, closes, slides, resizes, position changes. */
  smoothOut: [smoothOutX1, smoothOutY1, smoothOutX2, smoothOutY2] as const,
  /** Entrances that should pop: badges, counters. Never for a close. */
  bounce: [bounceX1, bounceY1, bounceX2, bounceY2] as const,
  /** Icon and text swaps, reveals. */
  inOut: 'easeInOut' as const,
} as const;

const microPixels = 4;
const basePixels = 8;
const mediumPixels = 12;

export const distance = {
  /** Text swap. */
  micro: microPixels,
  /** Page slide, badge reveal. */
  base: basePixels,
  /** Text reveal. */
  medium: mediumPixels,
} as const;

const largeScale = 0.96;
const smallScale = 0.98;

export const scale = {
  /** Modal open and close. */
  large: largeScale,
  /** Tooltip and chip entrances. */
  small: smallScale,
} as const;

const smallBlurPixels = 2;
const mediumBlurPixels = 3;

export const blur = {
  small: `blur(${smallBlurPixels}px)`,
  medium: `blur(${mediumBlurPixels}px)`,
  none: 'blur(0px)',
} as const;
