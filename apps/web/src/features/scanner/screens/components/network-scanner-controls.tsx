import { Spinner } from '@/shared/components/motion-loading';
import type { useNetworkScanner } from '../hooks/use-network-scanner';
import { NetworkScannerSettings } from './network-scanner-settings';

type ControlsProps = {
  readonly controller: ReturnType<typeof useNetworkScanner>;
  readonly isDisabled: boolean;
};
export const NetworkScannerControls = ({
  controller,
  isDisabled,
}: ControlsProps) => {
  const {
    capabilities,
    isLoadingCapabilities,
    isScanning,
    inputSource,
    colorMode,
    resolution,
    setSource,
    setColorMode,
    setResolution,
    handleScan,
  } = controller;
  if (isLoadingCapabilities) {
    return (
      <p className="flex items-center gap-2 py-4">
        <Spinner size="sm" />
        Loading capabilities…
      </p>
    );
  }
  if (!capabilities) {
    return (
      <p className="py-4">
        Could not fetch scanner capabilities. Select the scanner to retry.
      </p>
    );
  }
  return (
    <NetworkScannerSettings
      capabilities={capabilities}
      inputSource={inputSource}
      colorMode={colorMode}
      resolution={resolution}
      isScanning={isScanning}
      isDisabled={isDisabled}
      onSourceChange={(source) => setSource(source)}
      onColorModeChange={setColorMode}
      onResolutionChange={setResolution}
      onScan={handleScan}
    />
  );
};
