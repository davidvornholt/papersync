'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

type PageTransitionProps = {
  readonly children: ReactNode;
};

export const PageTransition = ({
  children,
}: PageTransitionProps): React.ReactElement => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

type StaggerContainerProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly staggerDelay?: number;
};

export const StaggerContainer = ({
  children,
  className = '',
  staggerDelay = 0.08,
}: StaggerContainerProps): React.ReactElement => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }}
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
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 16 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1],
        },
      },
    }}
  >
    {children}
  </motion.div>
);

type HoverScaleProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly scale?: number;
};

export const HoverScale = ({
  children,
  className = '',
  scale = 1.02,
}: HoverScaleProps): React.ReactElement => (
  <motion.div
    className={className}
    whileHover={{
      scale,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    }}
    whileTap={{ scale: 0.98 }}
  >
    {children}
  </motion.div>
);

type FadeInProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly duration?: number;
};

export const FadeIn = ({
  children,
  className = '',
  delay = 0,
  duration = 0.4,
}: FadeInProps): React.ReactElement => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

type SlideDirection = 'up' | 'down' | 'left' | 'right';

type SlideInProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly direction?: SlideDirection;
  readonly delay?: number;
};

const slideOffsets: Record<SlideDirection, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
};

export const SlideIn = ({
  children,
  className = '',
  direction = 'up',
  delay = 0,
}: SlideInProps): React.ReactElement => {
  const offset = slideOffsets[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
};

type PresenceContainerProps = {
  readonly children: ReactNode;
  readonly show: boolean;
};

export const PresenceContainer = ({
  children,
  show,
}: PresenceContainerProps): React.ReactElement => (
  <AnimatePresence mode="wait">
    {show && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);
