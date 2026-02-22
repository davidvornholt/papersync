'use client';

import { motion } from 'motion/react';

// ============================================================================
// Skeleton Base
// ============================================================================

type SkeletonProps = {
  readonly className?: string;
};

export const Skeleton = ({
  className = '',
}: SkeletonProps): React.ReactElement => (
  <motion.div
    className={`bg-border rounded ${className}`}
    animate={{
      opacity: [0.5, 0.8, 0.5],
    }}
    transition={{
      duration: 1.5,
      repeat: Number.POSITIVE_INFINITY,
      ease: 'easeInOut',
    }}
  />
);

// ============================================================================
// Text Skeleton
// ============================================================================

type TextSkeletonProps = {
  readonly lines?: number;
  readonly className?: string;
};

export const TextSkeleton = ({
  lines = 3,
  className = '',
}: TextSkeletonProps): React.ReactElement => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={`text-line-${Math.random().toString(36).slice(2)}`}
        className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
      />
    ))}
  </div>
);

// ============================================================================
// Card Skeleton
// ============================================================================

export const CardSkeleton = (): React.ReactElement => (
  <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
    <Skeleton className="h-6 w-1/3" />
    <TextSkeleton lines={2} />
    <div className="flex gap-3">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// ============================================================================
// Task List Skeleton
// ============================================================================

export const TaskListSkeleton = (): React.ReactElement => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map(() => (
      <div
        key={`task-${Math.random().toString(36).slice(2)}`}
        className="flex items-start gap-3 py-3"
      >
        <Skeleton className="w-5 h-5 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// ============================================================================
// Dashboard Skeleton
// ============================================================================

export const DashboardSkeleton = (): React.ReactElement => (
  <div className="page-container">
    {/* Header */}
    <div className="page-header">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
    </div>

    {/* Quick Actions */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>

    {/* Task Sections */}
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-lg p-6">
        <Skeleton className="h-6 w-24 mb-4" />
        <TaskListSkeleton />
      </div>
    </div>
  </div>
);

// ============================================================================
// Planner Skeleton
// ============================================================================

export const PlannerSkeleton = (): React.ReactElement => (
  <div className="page-container">
    <div className="page-header">
      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-5 w-48 mt-2" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
      <CardSkeleton />
    </div>
  </div>
);
