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
  const [discoveryStatus, setDiscoveryStatus] = useState<
    'idle' | 'searching' | 'complete' | 'failed'
  >('idle');
  const { addToast } = useToast();
  const onFailure = (error: { readonly message: string }) =>
    Effect.sync(() => {
      setDiscoveryStatus('failed');
      addToast(error.message, 'error');
    });
  const handleDiscover = () => {
    setDiscoveryStatus('searching');
    Effect.runFork(
      requestAction(() => discoverScanners(discoveryMilliseconds)).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (result.success) {
              setScanners(result.scanners);
              setDiscoveryStatus('complete');
            } else {
              setDiscoveryStatus('failed');
              addToast(result.error, 'error');
            }
          }),
        ),
        Effect.catchAll(onFailure),
      ),
    );
  };
  return {
    scanners,
    discoveryStatus,
    isDiscovering: discoveryStatus === 'searching',
    handleDiscover,
  };
};
