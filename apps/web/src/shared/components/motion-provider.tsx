'use client';

import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Honour the operating system's reduced-motion setting for every `motion`
 * animation: transforms and layout animations are skipped, opacity and
 * colour changes still play. CSS animations follow the same media query in
 * the shared theme.
 */
export const MotionProvider = ({
  children,
}: {
  readonly children: ReactNode;
}): React.ReactElement => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
