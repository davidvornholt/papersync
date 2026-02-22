'use client';

import { Effect } from 'effect';
import { useCallback, useState } from 'react';
import type { Subject, WeekId } from '@/shared/types';
import {
  downloadPlannerPdf,
  getWeekDateRange,
  getWeekId,
} from '../services/generator';

// ============================================================================
// Types
// ============================================================================

type TimetableSlot = {
  readonly id: string;
  readonly subjectId: string;
};

type TimetableDay = {
  readonly day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  readonly slots: readonly TimetableSlot[];
};

export type PlannerState =
  | { readonly status: 'idle' }
  | { readonly status: 'generating' }
  | { readonly status: 'generated'; readonly blob: Blob }
  | { readonly status: 'error'; readonly error: string };

export type UsePlannerReturn = {
  readonly state: PlannerState;
  readonly weekId: WeekId;
  readonly dateRange: { start: Date; end: Date };
  readonly generate: (
    subjects: readonly Subject[],
    timetable: readonly TimetableDay[],
  ) => Promise<void>;
  readonly download: () => void;
  readonly openInNewTab: () => void;
  readonly reset: () => void;
};

// ============================================================================
// Effect-Based Helpers
// ============================================================================

const fetchPdfEffect = (
  weekId: WeekId,
  subjects: readonly Subject[],
  timetable: readonly TimetableDay[],
): Effect.Effect<Blob, Error> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch('/api/planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekId,
          subjects,
          timetable,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        return Promise.reject(
          new Error(errorData.error ?? 'Failed to generate PDF'),
        );
      }

      return response.blob();
    },
    catch: (error) =>
      error instanceof Error
        ? error
        : new Error('Failed to generate planner PDF'),
  });

// ============================================================================
// Hook
// ============================================================================

export const usePlanner = (initialWeekId?: WeekId): UsePlannerReturn => {
  const weekId = initialWeekId ?? getWeekId();
  const dateRange = getWeekDateRange(weekId);

  const [state, setState] = useState<PlannerState>({ status: 'idle' });

  const generate = useCallback(
    async (
      subjects: readonly Subject[],
      timetable: readonly TimetableDay[],
    ): Promise<void> => {
      setState({ status: 'generating' });

      const result = await Effect.runPromise(
        fetchPdfEffect(weekId, subjects, timetable).pipe(
          Effect.map((blob) => ({ success: true as const, blob })),
          Effect.catchAll((error) =>
            Effect.succeed({ success: false as const, error: error.message }),
          ),
        ),
      );

      if (result.success) {
        setState({ status: 'generated', blob: result.blob });
      } else {
        setState({ status: 'error', error: result.error });
      }
    },
    [weekId],
  );

  const download = useCallback((): void => {
    if (state.status !== 'generated') return;

    Effect.runSync(downloadPlannerPdf(state.blob, weekId));
  }, [state, weekId]);

  const openInNewTab = useCallback((): void => {
    if (state.status !== 'generated') return;

    const url = URL.createObjectURL(state.blob);
    window.open(url, '_blank');
  }, [state]);

  const reset = useCallback((): void => {
    setState({ status: 'idle' });
  }, []);

  return {
    state,
    weekId,
    dateRange,
    generate,
    download,
    openInNewTab,
    reset,
  };
};
