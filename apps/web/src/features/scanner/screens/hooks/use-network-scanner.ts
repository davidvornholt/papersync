'use client';
import { Effect, Fiber } from 'effect';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/shared/components/use-toast';
import { requestAction } from '@/shared/http/action';
import { getScannerCapabilities } from '../../actions/discover';
import { scanFromDevice } from '../../actions/scan-from-device';
import type {
  ColorMode,
  InputSource,
  ScannerCapabilities,
} from '../../services/escl-types';
import type { DiscoveredScanner } from '../../services/scanner-discovery-types';
import { useScannerDiscovery } from './use-scanner-discovery';

const defaultResolution = 300;
const _discoveryMilliseconds = 10_000;
export const useNetworkScanner = (
  onScanComplete: (imageData: string) => void,
) => {
  const { scanners, discoveryStatus, isDiscovering, handleDiscover } =
    useScannerDiscovery();
  const [selectedScanner, setSelectedScanner] =
    useState<DiscoveredScanner | null>(null);
  const [capabilities, setCapabilities] = useState<ScannerCapabilities | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(false);
  const [resolution, setResolution] = useState(defaultResolution);
  const [colorMode, setColorMode] = useState<ColorMode>('color');
  const [inputSource, setInputSource] = useState<InputSource>('Platen');
  const capabilitiesRef = useRef<Fiber.RuntimeFiber<unknown, never> | null>(
    null,
  );
  const { addToast } = useToast();
  const onFailure = (error: { readonly message: string }) =>
    Effect.sync(() => addToast(error.message, 'error'));
  useEffect(
    () => () => {
      if (capabilitiesRef.current) {
        Effect.runFork(Fiber.interrupt(capabilitiesRef.current));
      }
    },
    [],
  );
  const setSource = (source: InputSource, available = capabilities) => {
    if (!available) {
      return;
    }
    const { resolutions, colorModes } = available.sourceCapabilities[source];
    const [firstResolution] = resolutions;
    const [firstColorMode] = colorModes;
    setInputSource(source);
    setResolution(
      resolutions.includes(defaultResolution)
        ? defaultResolution
        : firstResolution,
    );
    setColorMode(firstColorMode);
  };
  const handleSelectScanner = (scanner: DiscoveredScanner) => {
    if (capabilitiesRef.current) {
      Effect.runFork(Fiber.interrupt(capabilitiesRef.current));
    }
    setSelectedScanner(scanner);
    setCapabilities(null);
    setIsLoadingCapabilities(true);
    capabilitiesRef.current = Effect.runFork(
      requestAction(() => getScannerCapabilities(scanner)).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (!result.success) {
              addToast(result.error, 'error');
              return;
            }
            setCapabilities(result.capabilities);
            const [source] = result.capabilities.inputSources;
            setSource(source ?? 'Platen', result.capabilities);
          }),
        ),
        Effect.catchAll(onFailure),
        Effect.ensuring(Effect.sync(() => setIsLoadingCapabilities(false))),
      ),
    );
  };
  const handleScan = () => {
    if (!selectedScanner) {
      return;
    }
    const scanner = selectedScanner;
    setIsScanning(true);
    Effect.runFork(
      requestAction(() =>
        scanFromDevice(scanner, {
          colorMode,
          resolution,
          format: 'jpeg',
          inputSource,
        }),
      ).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (result.success) {
              onScanComplete(result.imageData);
            } else {
              addToast(result.error, 'error');
            }
          }),
        ),
        Effect.catchAll(onFailure),
        Effect.ensuring(Effect.sync(() => setIsScanning(false))),
      ),
    );
  };
  return {
    scanners,
    discoveryStatus,
    selectedScanner,
    capabilities,
    isDiscovering,
    isScanning,
    isLoadingCapabilities,
    resolution,
    colorMode,
    inputSource,
    setResolution,
    setColorMode,
    setSource,
    handleDiscover,
    handleSelectScanner,
    handleScan,
  };
};
