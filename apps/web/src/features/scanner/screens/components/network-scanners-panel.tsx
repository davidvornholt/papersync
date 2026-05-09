'use client';

import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { useCallback, useState } from 'react';
import { Spinner } from '@/shared/components/motion';
import { useToast } from '@/shared/components/toast';
import {
  discoverScanners,
  getScannerCapabilities,
} from '../../actions/discover';
import { scanFromDevice } from '../../actions/scan-from-device';
import type {
  ColorMode,
  InputSource,
  ScannerCapabilities,
} from '../../services/escl-client';
import type { DiscoveredScanner } from '../../services/scanner-discovery';
import { NetworkScannerList } from './network-scanner-list';
import { NetworkScannerSettings } from './network-scanner-settings';

type NetworkScannersPanelProps = {
  readonly onScanComplete: (imageData: string) => void;
  readonly isDisabled: boolean;
};

export const NetworkScannersPanel = ({
  onScanComplete,
  isDisabled,
}: NetworkScannersPanelProps): React.ReactElement => {
  const [scanners, setScanners] = useState<DiscoveredScanner[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedScanner, setSelectedScanner] =
    useState<DiscoveredScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(false);
  const [capabilities, setCapabilities] = useState<ScannerCapabilities | null>(
    null,
  );
  const [resolution, setResolution] = useState<number>(300);
  const [colorMode, setColorMode] = useState<ColorMode>('color');
  const [inputSource, setInputSource] = useState<InputSource>('Platen');
  const { addToast } = useToast();

  const handleDiscover = useCallback(() => {
    setIsDiscovering(true);
    void discoverScanners(10000)
      .then((result) => {
        if (result.success) {
          setScanners([...result.scanners]);
          addToast(
            result.scanners.length > 0
              ? `Found ${result.scanners.length} scanner(s)`
              : 'No scanners found on network',
            result.scanners.length > 0 ? 'success' : 'info',
          );
          return;
        }
        addToast(result.error, 'error');
      })
      .finally(() => {
        setIsDiscovering(false);
      });
  }, [addToast]);

  const handleSelectScanner = useCallback(
    (scanner: DiscoveredScanner) => {
      setSelectedScanner(scanner);
      setCapabilities(null);
      setIsLoadingCapabilities(true);

      void getScannerCapabilities(scanner)
        .then((result) => {
          if (!result.success) {
            addToast(`Failed to fetch capabilities: ${result.error}`, 'error');
            return;
          }

          setCapabilities(result.capabilities);
          const firstSource = result.capabilities.inputSources[0] || 'Platen';
          setInputSource(firstSource);

          const sourceCaps =
            result.capabilities.sourceCapabilities[firstSource];
          if (sourceCaps.resolutions.length > 0) {
            setResolution(
              sourceCaps.resolutions.includes(300)
                ? 300
                : sourceCaps.resolutions[0],
            );
          }
          if (sourceCaps.colorModes.length > 0) {
            setColorMode(sourceCaps.colorModes[0]);
          }
        })
        .finally(() => {
          setIsLoadingCapabilities(false);
        });
    },
    [addToast],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3 justify-between">
          <h2 className="serif text-[20px] tracking-[-0.022em] text-ink">
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
          <p className="text-[13px] text-graphite text-center py-6">
            Click discover to find compatible scanners on your network
          </p>
        ) : (
          <div className="space-y-5">
            <NetworkScannerList
              scanners={scanners}
              selectedScannerId={selectedScanner?.id}
              onSelect={(scanner) => void handleSelectScanner(scanner)}
            />

            {selectedScanner && (
              <div className="pt-5 border-t border-hairline space-y-4">
                {isLoadingCapabilities ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner size="sm" className="mr-2" />
                    <span className="text-[13px] text-graphite">
                      Loading capabilities...
                    </span>
                  </div>
                ) : capabilities ? (
                  <NetworkScannerSettings
                    capabilities={capabilities}
                    inputSource={inputSource}
                    colorMode={colorMode}
                    resolution={resolution}
                    isScanning={isScanning}
                    isDisabled={isDisabled}
                    onSourceChange={(source) => {
                      setInputSource(source);
                      const sourceCaps =
                        capabilities.sourceCapabilities[source];
                      setResolution(
                        sourceCaps.resolutions.includes(300)
                          ? 300
                          : sourceCaps.resolutions[0],
                      );
                      setColorMode(sourceCaps.colorModes[0]);
                    }}
                    onColorModeChange={setColorMode}
                    onResolutionChange={setResolution}
                    onScan={() => {
                      if (!selectedScanner) {
                        return;
                      }
                      setIsScanning(true);
                      scanFromDevice(selectedScanner, {
                        colorMode,
                        resolution,
                        format: 'jpeg',
                        inputSource,
                      }).then((result) => {
                        setIsScanning(false);
                        if (result.success) {
                          onScanComplete(result.imageData);
                          addToast('Scan completed successfully', 'success');
                        } else {
                          addToast(result.error, 'error');
                        }
                      });
                    }}
                  />
                ) : (
                  <p className="text-[13px] text-graphite text-center py-2">
                    Failed to load capabilities
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
