'use client';

import { Effect, Result } from 'effect';
import { type Dispatch, type SetStateAction, useState } from 'react';
import { scanPageLimit } from '../services/scan-limits';
import { prepareScanPage } from './scan-page-image';
import type { ScanNotify, ScanPage, ScanState } from './use-scan-types';

const clearError = (current: ScanState): ScanState =>
  current.status === 'error' ? { status: 'idle' } : current;

export const useScanPages = ({
  notify,
  setState,
}: {
  readonly notify: ScanNotify;
  readonly setState: Dispatch<SetStateAction<ScanState>>;
}) => {
  const [pages, setPages] = useState<ReadonlyArray<ScanPage>>([]);
  const [isPreparing, setIsPreparing] = useState(false);

  const addPages = (files: ReadonlyArray<Blob>) => {
    const room = scanPageLimit - pages.length;
    if (files.length > room) {
      notify(`Analyze up to ${scanPageLimit} photos at once.`, 'error');
    }
    if (room <= 0 || files.length === 0) {
      return;
    }
    setIsPreparing(true);
    Effect.runFork(
      Effect.forEach(files.slice(0, room), (file) =>
        Effect.result(prepareScanPage(file)),
      ).pipe(
        Effect.flatMap((results) =>
          Effect.sync(() => {
            const failure = results.find(Result.isFailure);
            if (failure) {
              notify(failure.failure.message, 'error');
            }
            const prepared = results.filter(Result.isSuccess).map((result) => ({
              id: crypto.randomUUID(),
              image: result.success,
            }));
            setPages((current) =>
              [...current, ...prepared].slice(0, scanPageLimit),
            );
            setState(clearError);
          }),
        ),
        Effect.ensuring(Effect.sync(() => setIsPreparing(false))),
      ),
    );
  };

  const removePage = (id: string) => {
    setPages((current) => current.filter((page) => page.id !== id));
    setState(clearError);
  };

  return { pages, setPages, isPreparing, addPages, removePage };
};
