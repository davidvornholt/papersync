import { Button } from '@papersync/ui/button';
import { useId } from 'react';
import type {
  ColorMode,
  InputSource,
  ScannerCapabilities,
} from '@/features/scanner/services/escl-types';
import { Spinner } from '@/shared/components/motion-loading';

type NetworkScannerSettingsProps = {
  readonly capabilities: ScannerCapabilities;
  readonly inputSource: InputSource;
  readonly colorMode: ColorMode;
  readonly resolution: number;
  readonly isScanning: boolean;
  readonly isDisabled: boolean;
  readonly onSourceChange: (source: InputSource) => void;
  readonly onColorModeChange: (mode: ColorMode) => void;
  readonly onResolutionChange: (resolution: number) => void;
  readonly onScan: () => void;
};

const colorModeLabels = {
  color: 'Color',
  grayscale: 'Grayscale',
  blackwhite: 'Black & white',
};
const selectClass =
  'w-full bg-transparent border-0 border-b border-hairline-strong px-0 py-2 text-[14px] text-ink focus:outline-none focus:border-ink cursor-pointer';

export const NetworkScannerSettings = ({
  capabilities,
  inputSource,
  colorMode,
  resolution,
  isScanning,
  isDisabled,
  onSourceChange,
  onColorModeChange,
  onResolutionChange,
  onScan,
}: NetworkScannerSettingsProps): React.ReactElement => {
  const instanceId = useId();
  return (
    <>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        {capabilities.inputSources.length > 1 ? (
          <div className="sm:col-span-2">
            <label
              htmlFor={`${instanceId}-inputSource`}
              className="field-label"
            >
              Scanner source
            </label>
            <select
              id={`${instanceId}-inputSource`}
              value={inputSource}
              onChange={(e) => onSourceChange(e.target.value as InputSource)}
              className={selectClass}
            >
              {capabilities.inputSources.map((source) => (
                <option key={source} value={source}>
                  {source === 'Platen'
                    ? 'Flatbed glass'
                    : 'Document feeder (ADF)'}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor={`${instanceId}-resolution`} className="field-label">
            Resolution
          </label>
          <select
            id={`${instanceId}-resolution`}
            value={resolution}
            onChange={(e) => onResolutionChange(Number(e.target.value))}
            className={selectClass}
          >
            {capabilities.sourceCapabilities[inputSource].resolutions.map(
              (res) => (
                <option key={res} value={res}>
                  {res} DPI
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label htmlFor={`${instanceId}-colorMode`} className="field-label">
            Color mode
          </label>
          <select
            id={`${instanceId}-colorMode`}
            value={colorMode}
            onChange={(e) => onColorModeChange(e.target.value as ColorMode)}
            className={selectClass}
          >
            {capabilities.sourceCapabilities[inputSource].colorModes.map(
              (mode) => (
                <option key={mode} value={mode}>
                  {colorModeLabels[mode]}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <Button
        variant="primary"
        onClick={onScan}
        disabled={isScanning || isDisabled}
        className="mt-2 w-full"
      >
        {isScanning ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Scanning...
          </>
        ) : (
          'Scan document'
        )}
      </Button>
    </>
  );
};
