import { Button } from '@papersync/ui/button';
import { Spinner } from '@/shared/components/motion';
import type {
  ColorMode,
  InputSource,
  ScannerCapabilities,
} from '../../services/escl-client';

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
}: NetworkScannerSettingsProps): React.ReactElement => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
      {capabilities.inputSources.length > 1 && (
        <div className="sm:col-span-2">
          <label htmlFor="inputSource" className="field-label">
            Scanner source
          </label>
          <select
            id="inputSource"
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
      )}

      <div>
        <label htmlFor="resolution" className="field-label">
          Resolution
        </label>
        <select
          id="resolution"
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
        <label htmlFor="colorMode" className="field-label">
          Color mode
        </label>
        <select
          id="colorMode"
          value={colorMode}
          onChange={(e) => onColorModeChange(e.target.value as ColorMode)}
          className={selectClass}
        >
          {capabilities.sourceCapabilities[inputSource].colorModes.map(
            (mode) => (
              <option key={mode} value={mode}>
                {mode === 'color'
                  ? 'Color'
                  : mode === 'grayscale'
                    ? 'Grayscale'
                    : 'Black & white'}
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
      className="w-full mt-2"
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
