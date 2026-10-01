'use client';
import { Effect } from 'effect';
import { useState } from 'react';
import { useToast } from '@/shared/components/use-toast';
import { saveHomework } from '@/shared/homework/actions';
import { requestAction } from '@/shared/http/action';
import type { UseScanReturn } from '../../hooks/use-scan-types';

type SaveOptions = {
  readonly scan: UseScanReturn;
};
export const useScanSave = ({ scan }: SaveOptions) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToast();
  const handleSync = () => {
    const { entries, weekId } = scan;
    if (entries.length === 0 || !weekId || !scan.canSave || isSyncing) {
      return;
    }
    setIsSyncing(true);
    Effect.runFork(
      requestAction(() =>
        saveHomework(
          entries.filter((entry) => entry.action !== 'skip'),
          weekId,
        ),
      ).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (result.success) {
              addToast(
                `${result.count} tasks waiting for Super Productivity. Click “Import homework” there.`,
                'success',
              );
              scan.clear();
            } else {
              addToast(`Save failed: ${result.error}`, 'error');
            }
          }),
        ),
        Effect.catchAll((error) =>
          Effect.sync(() => addToast(error.message, 'error')),
        ),
        Effect.ensuring(Effect.sync(() => setIsSyncing(false))),
      ),
    );
  };
  return { isSyncing, handleSync };
};
