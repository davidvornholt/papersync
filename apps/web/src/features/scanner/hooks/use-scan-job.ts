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
  readonly state: ScanState;
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

/**
 * Uploads photos and follows the resulting server job. Following is tied to
 * the visible page: hiding or leaving Scan pauses it, showing Scan resumes it.
 * The analysis itself continues on the server either way.
 */
export const useScanJob = ({
  state,
  setState,
  setWeek,
  setEntries,
  notify,
}: ScanJobOptions) => {
  const uploadFiberRef = useRef<Fiber.RuntimeFiber<void> | null>(null);

  const showFinished = useEffectEvent((finished: FinishedScanJob) => {
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
  });

  const followedJobId = state.status === 'processing' ? state.jobId : null;
  useEffect(() => {
    if (!followedJobId) {
      return;
    }
    const fiber = Effect.runFork(
      awaitScanJob(followedJobId).pipe(
        Effect.match({
          onFailure: (error): FinishedScanJob => ({
            status: 'failed',
            error: error.message,
          }),
          onSuccess: (finished) => finished,
        }),
        Effect.flatMap((finished) => Effect.sync(() => showFinished(finished))),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [followedJobId]);

  const stop = () => {
    if (uploadFiberRef.current) {
      Effect.runFork(Fiber.interrupt(uploadFiberRef.current));
      uploadFiberRef.current = null;
    }
  };

  // The upload is not tied to the page: it finishes while Scan is hidden, and
  // the job id it returns is followed once Scan shows again.
  const start = (
    images: ReadonlyArray<Blob>,
    weekId: WeekId | null,
    aiSettings: AISettings,
  ) => {
    stop();
    uploadFiberRef.current = Effect.runFork(
      startScanJob(images, weekId, aiSettings).pipe(
        Effect.match({
          onFailure: (error) => {
            setState({ status: 'error', error: error.message });
            notify(error.message, 'error');
          },
          onSuccess: (jobId) => setState({ status: 'processing', jobId }),
        }),
        Effect.ensuring(
          Effect.sync(() => {
            uploadFiberRef.current = null;
          }),
        ),
      ),
    );
  };

  return { start, stop };
};
