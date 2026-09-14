'use client';

import { motion } from 'motion/react';
import { blur, duration, ease } from '@/shared/motion/tokens';

const startRotationDegrees = 80;
const startOffsetPixels = 40;
// A short beat so the badge lands before the tick is drawn.
const pathDelaySeconds = 0.08;

type SuccessCheckProps = {
  readonly className?: string;
  readonly title: string;
};

/**
 * A completed action: the badge turns and rises into place through a blur,
 * then the tick draws itself.
 */
export const SuccessCheck = ({
  className = '',
  title,
}: SuccessCheckProps): React.ReactElement => (
  <motion.div
    initial={{
      opacity: 0,
      rotate: startRotationDegrees,
      y: startOffsetPixels,
      filter: blur.large,
    }}
    animate={{ opacity: 1, rotate: 0, y: 0, filter: blur.none }}
    transition={{
      duration: duration.verySlow,
      ease: ease.smoothOut,
      y: { duration: duration.verySlow, ease: ease.bounce },
    }}
    className={`flex items-center justify-center rounded-full bg-accent-soft ${className}`}
  >
    <svg
      className="size-1/2 text-accent"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <title>{title}</title>
      <motion.path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
        d="M5 13l4 4L19 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: duration.verySlow,
          ease: ease.smoothOut,
          delay: pathDelaySeconds,
        }}
      />
    </svg>
  </motion.div>
);
