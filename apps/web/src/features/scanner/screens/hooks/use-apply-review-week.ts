'use client';

import { Effect } from 'effect';
import { useToast } from '@/shared/components/use-toast';
import type { ExtractedEntry } from '@/shared/homework/entry';
import { requestAction } from '@/shared/http/action';
import type { UseScanReturn } from '../../hooks/use-scan-types';

export const useApplyReviewWeek = (
  scan: UseScanReturn,
  entries: ReadonlyArray<ExtractedEntry>,
  setEntries: (entries: Array<ExtractedEntry>) => void,
) => {
  const { addToast } = useToast();
  return () => {
    Effect.runFork(
      requestAction(() => scan.applyWeek(entries)).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (!result) {
              return;
            }
            if (result.success) {
              setEntries([...result.entries]);
              addToast(
                'Week applied. Your edits are preserved; check due dates against the paper before saving.',
                'info',
              );
            } else {
              addToast(result.error, 'error');
            }
          }),
        ),
        Effect.catchAll((error) =>
          Effect.sync(() => addToast(error.message, 'error')),
        ),
      ),
    );
  };
};
