'use client';

import { Effect } from 'effect';
import { useRef, useState } from 'react';
import { clearSavedScanDraft, clearScanDraft } from './scan-draft-store';
import { cancelScanJob } from './scan-job-client';
import type { ScanNotify, ScanPage, ScanState } from './use-scan-types';

type ClearScanOptions = {
  readonly state: ScanState;
  readonly stop: () => void;
  // Null clears every photo; saved photos leave the ones added since.
  readonly reset: (saved: ReadonlyArray<ScanPage> | null) => void;
  readonly notify: ScanNotify;
};

export const stopScanAnalysis = (state: ScanState, stop: () => void): void => {
  stop();
  if (state.status === 'processing' && state.jobId) {
    Effect.runFork(cancelScanJob(state.jobId));
  }
};

export const useClearScan = ({
  state,
  stop,
  reset,
  notify,
}: ClearScanOptions) => {
  const isClearingRef = useRef(false);
  const [isClearing, setIsClearing] = useState(false);
  const run = (saved: ReadonlyArray<ScanPage> | null) => {
    if (isClearingRef.current) {
      return;
    }
    isClearingRef.current = true;
    setIsClearing(true);
    stopScanAnalysis(state, stop);
    Effect.runFork(
      (saved ? clearSavedScanDraft(saved) : clearScanDraft).pipe(
        Effect.tap(() => Effect.sync(() => reset(saved))),
        Effect.catch((error) =>
          Effect.sync(() => notify(error.message, 'error')),
        ),
        Effect.ensuring(
          Effect.sync(() => {
            isClearingRef.current = false;
            setIsClearing(false);
          }),
        ),
      ),
    );
  };
  return {
    clear: () => run(null),
    clearSaved: (saved: ReadonlyArray<ScanPage>) => run(saved),
    isClearing,
  };
};
