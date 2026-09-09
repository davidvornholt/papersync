import type { DiscoveredScanner } from '@/features/scanner/services/scanner-discovery-types';

type NetworkScannerListProps = {
  readonly scanners: ReadonlyArray<DiscoveredScanner>;
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
          className={`relative w-full cursor-pointer touch-manipulation border-hairline border-b px-4 py-3 text-left transition-colors duration-200 last:border-b-0 ${
            isSelected
              ? 'bg-paper-deep'
              : 'bg-transparent hover:bg-paper-deep/50 focus-visible:bg-paper-deep/50'
          }`}
        >
          {isSelected ? (
            <span
              aria-hidden={true}
              className="absolute inset-y-0 left-0 w-[2px] bg-accent"
            />
          ) : null}
          <p className="serif text-[16px] text-ink leading-tight">
            {scanner.name}
          </p>
          <p className="mono mt-1 text-[11px] text-graphite">
            {scanner.host}:{scanner.port}
          </p>
        </button>
      );
    })}
  </div>
);
