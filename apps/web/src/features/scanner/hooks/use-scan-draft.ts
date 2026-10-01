'use client';

import { Effect, Fiber } from 'effect';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ExtractedEntry } from '@/shared/homework/entry';
import type { WeekId } from '@/shared/types/schemas';
import {
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
// Some private browsing modes answer slowly or never; scanning must not wait.
const unlockAfterMilliseconds = 2000;

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

/**
 * Restores the stored scan once per visit, then keeps the stored copy
 * current. Next.js keeps a hidden page's state, so showing Scan again must not
 * restore over it; a slow read never overwrites work started meanwhile.
 */
export const useScanDraft = ({
  pages,
  state,
  weekId,
  entries,
  restore,
}: ScanDraftOptions): boolean => {
  const [isRestoring, setIsRestoring] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasLoadedRef = useRef(false);
  const onLoaded = useEffectEvent((draft: ScanDraft | null) => {
    hasLoadedRef.current = true;
    const isUntouched =
      pages.length === 0 &&
      state.status === 'idle' &&
      weekId === null &&
      entries.length === 0;
    if (draft && isUntouched) {
      restore(draft);
    }
    setHasLoaded(true);
    setIsRestoring(false);
  });
  const onSlowLoad = useEffectEvent(() => setIsRestoring(false));

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    const timer = setTimeout(onSlowLoad, unlockAfterMilliseconds);
    const fiber = Effect.runFork(
      readScanDraft.pipe(
        Effect.map((draft): ScanDraft | null => draft),
        Effect.catchAll((error) =>
          logStoreFailure(error).pipe(Effect.as(null)),
        ),
        Effect.flatMap((draft) => Effect.sync(() => onLoaded(draft))),
      ),
    );
    return () => {
      clearTimeout(timer);
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      Effect.runFork(
        writeScanPages(pages).pipe(Effect.catchAll(logStoreFailure)),
      );
    }
  }, [hasLoaded, pages]);

  useEffect(() => {
    if (hasLoaded) {
      Effect.runFork(
        writeScanReview(toStoredReview({ state, weekId, entries })).pipe(
          Effect.catchAll(logStoreFailure),
        ),
      );
    }
  }, [hasLoaded, state, weekId, entries]);

  return isRestoring;
};
