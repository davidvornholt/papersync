'use client';
import { Effect } from 'effect';
import { useState } from 'react';
import { useToast } from '@/shared/components/use-toast';
import { requestAction } from '@/shared/http/action';
import { discoverScanners } from '../../actions/discover';
import type { DiscoveredScanner } from '../../services/scanner-discovery-types';

const discoveryMilliseconds = 10_000;
export const useScannerDiscovery = () => {
  const [scanners, setScanners] = useState<ReadonlyArray<DiscoveredScanner>>(
    [],
  );
  const [isDiscovering, setIsDiscovering] = useState(false);
  const { addToast } = useToast();
  const onFailure = (error: { readonly message: string }) =>
    Effect.sync(() => addToast(error.message, 'error'));
  const handleDiscover = () => {
    setIsDiscovering(true);
    Effect.runFork(
      requestAction(() => discoverScanners(discoveryMilliseconds)).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (result.success) {
              setScanners(result.scanners);
            } else {
              addToast(result.error, 'error');
            }
          }),
        ),
        Effect.catchAll(onFailure),
        Effect.ensuring(Effect.sync(() => setIsDiscovering(false))),
      ),
    );
  };
  return { scanners, isDiscovering, handleDiscover };
};
