'use client';

import { Effect } from 'effect';
import { useRef, useState } from 'react';
import { clearScanDraft } from './scan-draft-store';
import { cancelScanJob } from './scan-job-client';
import type { ScanNotify, ScanState } from './use-scan-types';

type ClearScanOptions = {
  readonly state: ScanState;
  readonly stop: () => void;
  readonly reset: () => void;
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
  const clear = () => {
    if (isClearingRef.current) {
      return;
    }
    isClearingRef.current = true;
    setIsClearing(true);
    stopScanAnalysis(state, stop);
    Effect.runFork(
      clearScanDraft.pipe(
        Effect.tap(() => Effect.sync(reset)),
        Effect.catchAll((error) =>
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
  return { clear, isClearing };
};
