import { motion } from 'motion/react';
import type { DiscoveredScanner } from '../../services';

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
  <div className="space-y-2">
    {scanners.map((scanner) => (
      <motion.button
        key={scanner.id}
        type="button"
        onClick={() => onSelect(scanner)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`w-full p-3 rounded-lg border text-left transition-all ${
          selectedScannerId === scanner.id
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-accent/50'
        }`}
      >
        <p className="font-medium">{scanner.name}</p>
        <p className="text-sm text-muted">
          {scanner.host}:{scanner.port}
        </p>
      </motion.button>
    ))}
  </div>
);
