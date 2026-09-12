'use client';
import { Effect } from 'effect';
import { useState } from 'react';
import { useToast } from '@/shared/components/use-toast';
import { saveHomework } from '@/shared/homework/actions';
import type { ExtractedEntry } from '@/shared/homework/entry';
import { requestAction } from '@/shared/http/action';
import type { UseScanReturn } from '../../hooks/use-scan-types';

type SaveOptions = {
  readonly scan: UseScanReturn;
  readonly entries: ReadonlyArray<ExtractedEntry>;
  readonly clear: () => void;
};
export const useScanSave = ({ scan, entries, clear }: SaveOptions) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToast();
  const handleSync = () => {
    if (entries.length === 0 || !scan.weekId || isSyncing) {
      return;
    }
    const { weekId } = scan;
    setIsSyncing(true);
    Effect.runFork(
      requestAction(() => saveHomework(entries, weekId)).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (result.success) {
              addToast(
                `${result.count} tasks waiting for Super Productivity. Click “Import homework” there.`,
                'success',
              );
              clear();
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
