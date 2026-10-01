'use client';

import { Effect, Fiber } from 'effect';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useEffectEvent,
  useRef,
} from 'react';
import type { ExtractedEntry } from '@/shared/homework/entry';
import type { WeekId } from '@/shared/types/schemas';
import {
  awaitScanJob,
  type FinishedScanJob,
  startScanJob,
} from './scan-job-client';
import type { AISettings, ScanNotify, ScanState } from './use-scan-types';

type ScanJobOptions = {
  readonly setState: Dispatch<SetStateAction<ScanState>>;
  readonly setWeek: Dispatch<SetStateAction<WeekId | null>>;
  readonly setEntries: Dispatch<SetStateAction<ReadonlyArray<ExtractedEntry>>>;
  readonly notify: ScanNotify;
};

const toReviewEntries = (finished: FinishedScanJob & { status: 'complete' }) =>
  finished.analysis.data.entries.map(
    (entry): ExtractedEntry => ({
      id: crypto.randomUUID(),
      day: entry.day,
      subject: entry.subject,
      content: entry.content,
      action: entry.action,
      dueDate: entry.dueDate,
    }),
  );

const toFinished = Effect.match({
  onFailure: (error: { readonly message: string }): FinishedScanJob => ({
    status: 'failed',
    error: error.message,
  }),
  onSuccess: (finished: FinishedScanJob) => finished,
});

/** Starts and follows server-side analysis; following stops on unmount. */
export const useScanJob = ({
  setState,
  setWeek,
  setEntries,
  notify,
}: ScanJobOptions) => {
  const jobFiberRef = useRef<Fiber.RuntimeFiber<void> | null>(null);

  const stop = () => {
    if (jobFiberRef.current) {
      Effect.runFork(Fiber.interrupt(jobFiberRef.current));
      jobFiberRef.current = null;
    }
  };

  const show = (finished: FinishedScanJob) => {
    jobFiberRef.current = null;
    if (finished.status === 'failed') {
      setState({ status: 'error', error: finished.error });
      notify(finished.error, 'error');
      return;
    }
    const { data, modelUsed } = finished.analysis;
    const entries = toReviewEntries(finished);
    setWeek(data.weekId);
    setEntries(entries);
    setState({
      status: 'complete',
      weekId: data.weekId,
      confidence: data.confidence,
      modelUsed,
      notes: data.notes,
    });
    const reviewCount = entries.filter(
      (entry) => entry.action !== 'skip',
    ).length;
    notify(
      entries.length > 0
        ? `Review ${reviewCount} new or changed entries`
        : 'No homework found in these photos',
      'info',
    );
  };

  const run = <E extends { readonly message: string }>(
    job: Effect.Effect<FinishedScanJob, E>,
  ) => {
    stop();
    jobFiberRef.current = Effect.runFork(
      job.pipe(
        toFinished,
        Effect.flatMap((finished) => Effect.sync(() => show(finished))),
      ),
    );
  };

  const follow = (jobId: string) => run(awaitScanJob(jobId));

  const start = (
    images: ReadonlyArray<Blob>,
    weekId: WeekId | null,
    aiSettings: AISettings,
  ) =>
    run(
      startScanJob(images, weekId, aiSettings).pipe(
        Effect.tap((jobId) =>
          Effect.sync(() => setState({ status: 'processing', jobId })),
        ),
        Effect.flatMap(awaitScanJob),
      ),
    );

  // Leaving the page stops waiting, not the analysis; it resumes on return.
  const stopOnUnmount = useEffectEvent(stop);
  useEffect(() => () => stopOnUnmount(), []);

  return { start, follow, stop };
};
