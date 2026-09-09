'use client';

import { Data, Effect } from 'effect';
import { useCallback, useState } from 'react';
import { getWeekDateRange, getWeekId } from '@/shared/planner/week';
import type { Subject, WeekId } from '@/shared/types/schemas';
import { downloadPlannerPdf } from '../services/generator';

type TimetableSlot = {
  readonly id: string;
  readonly subjectId: string;
};

type TimetableDay = {
  readonly day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  readonly slots: ReadonlyArray<TimetableSlot>;
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
    subjects: ReadonlyArray<Subject>,
    timetable: ReadonlyArray<TimetableDay>,
  ) => Promise<void>;
  readonly download: () => void;
  readonly openInNewTab: () => void;
  readonly reset: () => void;
};

class PlannerPdfFetchError extends Data.TaggedError('PlannerPdfFetchError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

const fetchPdfEffect = (
  weekId: WeekId,
  subjects: ReadonlyArray<Subject>,
  timetable: ReadonlyArray<TimetableDay>,
): Effect.Effect<Blob, PlannerPdfFetchError> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch('/api/planner', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ weekId, subjects, timetable }),
          signal,
        }),
      catch: (cause) =>
        new PlannerPdfFetchError({
          message: 'Could not reach PaperSync to generate the planner.',
          cause,
        }),
    });
    if (!response.ok) {
      return yield* Effect.fail(
        new PlannerPdfFetchError({
          message:
            'Could not generate the planner. Check your timetable and try again.',
        }),
      );
    }
    return yield* Effect.tryPromise({
      try: () => response.blob(),
      catch: (cause) =>
        new PlannerPdfFetchError({
          message: 'Could not fetch the generated planner.',
          cause,
        }),
    });
  });

export const usePlanner = (initialWeekId?: WeekId): UsePlannerReturn => {
  const weekId = initialWeekId ?? getWeekId();
  const dateRange = getWeekDateRange(weekId);

  const [state, setState] = useState<PlannerState>({ status: 'idle' });

  const generate = useCallback(
    (
      subjects: ReadonlyArray<Subject>,
      timetable: ReadonlyArray<TimetableDay>,
    ): Promise<void> => {
      setState({ status: 'generating' });
      return Effect.runPromise(
        fetchPdfEffect(weekId, subjects, timetable).pipe(
          Effect.tap((blob) =>
            Effect.sync(() => setState({ status: 'generated', blob })),
          ),
          Effect.catchAll((error) =>
            Effect.sync(() =>
              setState({ status: 'error', error: error.message }),
            ),
          ),
          Effect.asVoid,
        ),
      );
    },
    [weekId],
  );

  const download = useCallback((): void => {
    if (state.status !== 'generated') {
      return;
    }

    Effect.runSync(downloadPlannerPdf(state.blob, weekId));
  }, [state, weekId]);

  const openInNewTab = useCallback((): void => {
    if (state.status !== 'generated') {
      return;
    }

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
