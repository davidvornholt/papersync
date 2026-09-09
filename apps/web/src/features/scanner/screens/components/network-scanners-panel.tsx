'use client';

import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { useNetworkScanner } from '../hooks/use-network-scanner';
import { NetworkScannerControls } from './network-scanner-controls';
import { NetworkScannerList } from './network-scanner-list';

type NetworkScannersPanelProps = {
  readonly onScanComplete: (imageData: string) => void;
  readonly isDisabled: boolean;
};

export const NetworkScannersPanel = ({
  onScanComplete,
  isDisabled,
}: NetworkScannersPanelProps): React.ReactElement => {
  const controller = useNetworkScanner(onScanComplete);
  const {
    scanners,
    selectedScanner,
    isDiscovering,
    handleDiscover,
    handleSelectScanner,
  } = controller;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3">
          <h2 className="serif text-[20px] text-ink tracking-[-0.022em]">
            Network scanners
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDiscover}
            disabled={isDiscovering || isDisabled}
          >
            {isDiscovering ? 'Searching...' : 'Discover'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {scanners.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-graphite">
            Click discover to find compatible scanners on your network
          </p>
        ) : (
          <div className="space-y-5">
            <NetworkScannerList
              scanners={scanners}
              selectedScannerId={selectedScanner?.id}
              onSelect={(scanner) => handleSelectScanner(scanner)}
            />

            {selectedScanner ? (
              <NetworkScannerControls
                controller={controller}
                isDisabled={isDisabled}
              />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
