'use client';

import { Effect, Fiber } from 'effect';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ExtractedEntry } from '@/shared/homework/entry';
import type { WeekId } from '@/shared/types/schemas';
import type {
  ScanDraftConflictError,
  ScanDraftStoreError,
} from '../errors/scan-client';
import {
  type StoredReview,
  scanDraft,
  takeSharedPhotos,
} from './scan-draft-store';
import type { ScanNotify, ScanPage, ScanState } from './use-scan-types';

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
  readonly receiveShared: (photos: ReadonlyArray<Blob>) => void;
  readonly onConflict: (error: ScanDraftConflictError) => void;
};

const logStoreFailure = (error: { readonly message: string }) =>
  Effect.logWarning(error.message);
const reportWriteFailure = (
  onRefused: (error: ScanDraftConflictError) => void,
) =>
  Effect.catch((error: ScanDraftConflictError | ScanDraftStoreError) =>
    error._tag === 'ScanDraftConflictError'
      ? Effect.sync(() => onRefused(error))
      : logStoreFailure(error),
  );
// Some private browsing modes answer slowly or never; scanning must not wait.
const unlockAfterMilliseconds = 2000;

const toStoredReview = ({
  state,
  weekId,
  entries,
}: Pick<ScanDraftOptions, 'state' | 'weekId' | 'entries'>): StoredReview => ({
  weekId,
  jobId: state.status === 'processing' ? state.jobId : null,
  hasNewPages:
    (state.status === 'processing' || state.status === 'complete') &&
    state.hasNewPages,
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
 * Every later write from a stale tab is refused too, so this warns once and
 * keeps the warning until it is dismissed: a tab in the background would
 * otherwise look normal again by the time the user returns to it.
 */
export const useConflictWarning = (notify: ScanNotify) => {
  const hasWarnedRef = useRef(false);
  return (error: ScanDraftConflictError) => {
    if (!hasWarnedRef.current) {
      hasWarnedRef.current = true;
      notify(error.message, 'warning', 0);
    }
  };
};

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
  receiveShared,
  onConflict,
}: ScanDraftOptions): boolean => {
  const [isRestoring, setIsRestoring] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasLoadedRef = useRef(false);
  const hasTakenSharedRef = useRef(false);
  const onShared = useEffectEvent((photos: ReadonlyArray<Blob>) =>
    receiveShared(photos),
  );
  const onLoaded = useEffectEvent((draft: ScanDraft | null) => {
    hasLoadedRef.current = true;
    const isUntouched =
      pages.length === 0 &&
      state.status === 'idle' &&
      weekId === null &&
      entries.length === 0;
    if (draft && isUntouched) {
      restore(draft);
    } else if (draft) {
      scanDraft.keepLocalWork();
    }
    setHasLoaded(true);
    setIsRestoring(false);
  });
  const onSlowLoad = useEffectEvent(() => setIsRestoring(false));
  const onRefused = useEffectEvent((error: ScanDraftConflictError) =>
    onConflict(error),
  );

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    const timer = setTimeout(onSlowLoad, unlockAfterMilliseconds);
    const fiber = Effect.runFork(
      scanDraft.read.pipe(
        Effect.map((draft): ScanDraft | null => draft),
        Effect.catch((error) => logStoreFailure(error).pipe(Effect.as(null))),
        Effect.flatMap((draft) => Effect.sync(() => onLoaded(draft))),
      ),
    );
    return () => {
      clearTimeout(timer);
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);

  // Photos shared to PaperSync join the restored scan as new pages.
  useEffect(() => {
    if (!hasLoaded || hasTakenSharedRef.current) {
      return;
    }
    hasTakenSharedRef.current = true;
    Effect.runFork(
      takeSharedPhotos.pipe(
        Effect.catch((error) =>
          logStoreFailure(error).pipe(Effect.as<ReadonlyArray<Blob>>([])),
        ),
        Effect.flatMap((photos) =>
          Effect.sync(() => {
            if (photos.length > 0) {
              onShared(photos);
            }
          }),
        ),
      ),
    );
  }, [hasLoaded]);

  useEffect(() => {
    if (hasLoaded) {
      Effect.runFork(
        scanDraft.writePages(pages).pipe(reportWriteFailure(onRefused)),
      );
    }
  }, [hasLoaded, pages]);

  useEffect(() => {
    if (hasLoaded) {
      Effect.runFork(
        scanDraft
          .writeReview(toStoredReview({ state, weekId, entries }))
          .pipe(reportWriteFailure(onRefused)),
      );
    }
  }, [hasLoaded, state, weekId, entries]);

  return isRestoring;
};
