'use client';
import { Effect } from 'effect';
import { useState } from 'react';
import { useToast } from '@/shared/components/use-toast';
import type { Settings } from '@/shared/hooks/use-settings-schema';
import { requestAction } from '@/shared/http/action';
import { syncEntriesToVault } from '@/shared/vault/actions/sync';
import type { ExtractedEntry, UseScanReturn } from '../../hooks/use-scan-types';

type SaveOptions = {
  readonly scan: UseScanReturn;
  readonly entries: ReadonlyArray<ExtractedEntry>;
  readonly vault: Settings['vault'];
  readonly clear: () => void;
};
export const useScanSave = ({ scan, entries, vault, clear }: SaveOptions) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToast();
  const handleSync = () => {
    if (entries.length === 0 || !scan.weekId || isSyncing) {
      return;
    }
    const options = { ...vault, weekId: scan.weekId };
    setIsSyncing(true);
    Effect.runFork(
      requestAction(() => syncEntriesToVault(entries, options)).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (result.success) {
              addToast(result.notePath, 'success');
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
