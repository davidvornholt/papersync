'use client';

import { motion } from 'motion/react';

type SpinnerProps = {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
};

const spinnerSizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
} as const;

export const Spinner = ({
  size = 'md',
  className = '',
}: SpinnerProps): React.ReactElement => (
  <motion.div
    className={`rounded-full border-accent border-t-transparent ${spinnerSizes[size]} ${className}`}
    animate={{ rotate: 360 }}
    transition={{
      duration: 0.8,
      repeat: Number.POSITIVE_INFINITY,
      ease: 'linear',
    }}
  />
);
