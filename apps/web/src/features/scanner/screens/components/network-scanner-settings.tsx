import { Button, Spinner } from '@/shared/components';
import type {
  ColorMode,
  InputSource,
  ScannerCapabilities,
} from '../../services';

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
    <div className="grid grid-cols-2 gap-3">
      {capabilities.inputSources.length > 1 && (
        <div className="col-span-2">
          <label
            htmlFor="inputSource"
            className="text-sm text-muted block mb-1"
          >
            Scanner Source
          </label>
          <select
            id="inputSource"
            value={inputSource}
            onChange={(e) => onSourceChange(e.target.value as InputSource)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
          >
            {capabilities.inputSources.map((source) => (
              <option key={source} value={source}>
                {source === 'Platen'
                  ? 'Flatbed Glass'
                  : 'Document Feeder (ADF)'}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="resolution" className="text-sm text-muted block mb-1">
          Resolution
        </label>
        <select
          id="resolution"
          value={resolution}
          onChange={(e) => onResolutionChange(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
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
        <label htmlFor="colorMode" className="text-sm text-muted block mb-1">
          Color Mode
        </label>
        <select
          id="colorMode"
          value={colorMode}
          onChange={(e) => onColorModeChange(e.target.value as ColorMode)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
        >
          {capabilities.sourceCapabilities[inputSource].colorModes.map(
            (mode) => (
              <option key={mode} value={mode}>
                {mode === 'color'
                  ? 'Color'
                  : mode === 'grayscale'
                    ? 'Grayscale'
                    : 'Black & White'}
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
      className="w-full"
    >
      {isScanning ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Scanning...
        </>
      ) : (
        'Scan Document'
      )}
    </Button>
  </>
);
