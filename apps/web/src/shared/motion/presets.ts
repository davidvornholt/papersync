import type { Transition, Variants } from 'motion/react';
import { blur, distance, duration, ease, scale } from './tokens';

/** Smooth ease-out at the standard open duration. */
export const open: Transition = {
  duration: duration.fast,
  ease: ease.smoothOut,
};
/** Quieter, quicker close. Never bounces. */
export const close: Transition = {
  duration: duration.quick,
  ease: ease.smoothOut,
};

/**
 * Content arriving on screen: rises a little through a soft blur. Used for
 * page shells, cards, and rows. Exit is a quiet fade.
 */
export const rise: Variants = {
  hidden: { opacity: 0, y: distance.medium, filter: blur.medium },
  visible: {
    opacity: 1,
    y: 0,
    filter: blur.none,
    transition: { duration: duration.verySlow, ease: ease.smoothOut },
  },
  exit: { opacity: 0, transition: close },
};

/** Parent that staggers `rise` children by one stagger step. */
export const riseGroup: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: duration.stagger } },
};

/**
 * One region swapping between states (idle, loading, done, error). The new
 * state slides up through a blur; the old one fades out quickly.
 */
export const stateSwap: Variants = {
  hidden: { opacity: 0, y: distance.base, filter: blur.small },
  visible: {
    opacity: 1,
    y: 0,
    filter: blur.none,
    transition: open,
  },
  exit: {
    opacity: 0,
    y: -distance.micro,
    filter: blur.small,
    transition: close,
  },
};

/** Short text changing in place, such as a status word. */
export const textSwap: Variants = {
  hidden: { opacity: 0, y: distance.micro, filter: blur.small },
  visible: {
    opacity: 1,
    y: 0,
    filter: blur.none,
    transition: { duration: duration.quick, ease: ease.inOut },
  },
  exit: {
    opacity: 0,
    y: -distance.micro,
    filter: blur.small,
    transition: { duration: duration.quick, ease: ease.inOut },
  },
};

/** A list row entering or leaving; pairs with `layout` for neighbours. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: distance.base },
  visible: { opacity: 1, y: 0, transition: open },
  exit: { opacity: 0, x: distance.base, transition: close },
};

/** A small chip appearing or disappearing in a group. */
export const chip: Variants = {
  hidden: { opacity: 0, scale: scale.small },
  visible: { opacity: 1, scale: 1, transition: open },
  exit: { opacity: 0, scale: scale.small, transition: close },
};

/** Toasts rise from below, slower in than out. */
export const toast: Variants = {
  hidden: {
    opacity: 0,
    y: distance.medium,
    scale: scale.small,
    filter: blur.small,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: blur.none,
    transition: { duration: duration.medium, ease: ease.smoothOut },
  },
  exit: {
    opacity: 0,
    y: distance.base,
    scale: scale.small,
    filter: blur.small,
    transition: open,
  },
};

/** Props for a `motion` element that plays `variants` on mount and unmount. */
export const presence = {
  initial: 'hidden',
  animate: 'visible',
  exit: 'exit',
} as const;

/** Props for a `motion` element that reveals once when scrolled into view. */
export const revealOnce = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, margin: '-60px' },
} as const;

/** Shared-layout indicator that slides between tabs. */
export const indicator: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 40,
  mass: 1,
};
