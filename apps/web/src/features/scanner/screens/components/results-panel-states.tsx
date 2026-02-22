'use client';

import { motion } from 'motion/react';
import { Spinner } from '@/shared/components';

export const ResultsEmptyState = (): React.ReactElement => (
  <motion.div
    key="empty"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center justify-center flex-1 py-16 text-center"
  >
    <p className="text-foreground font-medium">No new entries detected</p>
    <p className="text-sm text-muted mt-1">
      The scan may not contain handwritten content
    </p>
  </motion.div>
);

export const ResultsProcessingState = (): React.ReactElement => (
  <motion.div
    key="processing"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center justify-center flex-1 py-16"
  >
    <Spinner size="lg" />
    <p className="mt-4 text-foreground font-medium">Analyzing handwriting...</p>
    <p className="text-sm text-muted mt-1">This may take a moment</p>
  </motion.div>
);

export const ResultsIdleState = (): React.ReactElement => (
  <motion.div
    key="idle"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center justify-center flex-1 py-16 text-center"
  >
    <p className="text-muted">Upload a scan to see extracted content</p>
    <p className="text-sm text-muted-light mt-1">
      AI will detect and extract handwritten entries
    </p>
  </motion.div>
);

export const ResultsErrorState = ({
  message,
}: {
  readonly message: string;
}): React.ReactElement => (
  <motion.div
    key="error"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center justify-center flex-1 py-16 text-center"
  >
    <p className="text-foreground font-medium">Processing Failed</p>
    <p className="text-sm text-muted mt-1">{message}</p>
  </motion.div>
);
