'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { presence, rise, riseGroup, stateSwap } from '@/shared/motion/presets';

type PageTransitionProps = {
  readonly children: ReactNode;
};

/** A screen arriving: the shell rises once through a soft blur. */
export const PageTransition = ({
  children,
}: PageTransitionProps): React.ReactElement => (
  <motion.div variants={rise} {...presence}>
    {children}
  </motion.div>
);

type StaggerContainerProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

/** Staggers `StaggerItem` children by one stagger step each. */
export const StaggerContainer = ({
  children,
  className = '',
}: StaggerContainerProps): React.ReactElement => (
  <motion.div
    className={className}
    variants={riseGroup}
    initial="hidden"
    animate="visible"
  >
    {children}
  </motion.div>
);

type StaggerItemProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export const StaggerItem = ({
  children,
  className = '',
}: StaggerItemProps): React.ReactElement => (
  <motion.div className={className} variants={rise}>
    {children}
  </motion.div>
);

type StateViewProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * One state of a region that swaps between states. Render inside an
 * `AnimatePresence mode="wait"` with a stable `key` per state.
 */
export const StateView = ({
  children,
  className = '',
}: StateViewProps): React.ReactElement => (
  <motion.div className={className} variants={stateSwap} {...presence}>
    {children}
  </motion.div>
);
