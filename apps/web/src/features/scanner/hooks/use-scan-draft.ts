'use client';

import { Duration, Effect, Fiber } from 'effect';
import { useEffect, useEffectEvent, useState } from 'react';
import type { ExtractedEntry } from '@/shared/homework/entry';
import type { WeekId } from '@/shared/types/schemas';
import {
  emptyReview,
  readScanDraft,
  type StoredReview,
  writeScanPages,
  writeScanReview,
} from './scan-draft-store';
import type { ScanPage, ScanState } from './use-scan-types';

export type ScanDraft = {
  readonly pages: ReadonlyArray<ScanPage>;
  readonly review: StoredReview;
};

type ScanDraftOptions = {
  readonly pages: ReadonlyArray<ScanPage>;
  readonly state: ScanState;
  readonly weekId: WeekId | null;
  readonly entries: ReadonlyArray<ExtractedEntry>;
  readonly restore: (draft: ScanDraft) => void;
};

const logStoreFailure = (error: { readonly message: string }) =>
  Effect.logWarning(error.message);
// Some private browsing modes never answer; scanning must not wait on them.
const restoreTimeout = Duration.seconds(2);

const toStoredReview = ({
  state,
  weekId,
  entries,
}: Omit<ScanDraftOptions, 'pages' | 'restore'>): StoredReview => ({
  weekId,
  jobId: state.status === 'processing' ? state.jobId : null,
  result:
    state.status === 'complete'
      ? {
          weekId: state.weekId,
          confidence: state.confidence,
          modelUsed: state.modelUsed,
          notes: state.notes,
        }
      : null,
  entries,
});

/** Restores the scan in progress once, then keeps the stored copy current. */
export const useScanDraft = ({
  pages,
  state,
  weekId,
  entries,
  restore,
}: ScanDraftOptions): boolean => {
  const [isRestoring, setIsRestoring] = useState(true);
  const onRestored = useEffectEvent((draft: ScanDraft) => {
    restore(draft);
    setIsRestoring(false);
  });

  useEffect(() => {
    const fiber = Effect.runFork(
      readScanDraft.pipe(
        Effect.timeoutFail({
          duration: restoreTimeout,
          onTimeout: () => ({
            message: 'The saved scan did not load in time.',
          }),
        }),
        Effect.catchAll((error) =>
          logStoreFailure(error).pipe(
            Effect.as({ pages: [], review: emptyReview }),
          ),
        ),
        Effect.flatMap((draft) => Effect.sync(() => onRestored(draft))),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);

  useEffect(() => {
    if (!isRestoring) {
      Effect.runFork(
        writeScanPages(pages).pipe(Effect.catchAll(logStoreFailure)),
      );
    }
  }, [isRestoring, pages]);

  useEffect(() => {
    if (!isRestoring) {
      Effect.runFork(
        writeScanReview(toStoredReview({ state, weekId, entries })).pipe(
          Effect.catchAll(logStoreFailure),
        ),
      );
    }
  }, [isRestoring, state, weekId, entries]);

  return isRestoring;
};
