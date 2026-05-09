import type { DiscoveredScanner } from '../../services/scanner-discovery';

type NetworkScannerListProps = {
  readonly scanners: readonly DiscoveredScanner[];
  readonly selectedScannerId?: string;
  readonly onSelect: (scanner: DiscoveredScanner) => void;
};

export const NetworkScannerList = ({
  scanners,
  selectedScannerId,
  onSelect,
}: NetworkScannerListProps): React.ReactElement => (
  <div className="-mx-1">
    {scanners.map((scanner) => {
      const isSelected = selectedScannerId === scanner.id;
      return (
        <button
          key={scanner.id}
          type="button"
          onClick={() => onSelect(scanner)}
          className={`relative w-full px-4 py-3 text-left transition-colors duration-200 cursor-pointer touch-manipulation border-b border-hairline last:border-b-0 ${
            isSelected
              ? 'bg-paper-deep'
              : 'bg-transparent hover:bg-paper-deep/50 focus-visible:bg-paper-deep/50'
          }`}
        >
          {isSelected && (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[2px] bg-accent"
            />
          )}
          <p className="serif text-[16px] text-ink leading-tight">
            {scanner.name}
          </p>
          <p className="mono text-[11px] text-graphite mt-1">
            {scanner.host}:{scanner.port}
          </p>
        </button>
      );
    })}
  </div>
);
