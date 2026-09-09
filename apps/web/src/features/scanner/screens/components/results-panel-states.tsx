'use client';

import { motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion-loading';
export const ResultsEmptyState = (): React.ReactElement => (
  <motion.div
    key="empty"
    initial={false}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-1 flex-col items-center justify-center py-16 text-center"
  >
    <p className="font-medium text-foreground">No new entries detected</p>
    <p className="mt-1 text-muted text-sm">
      The scan may not contain handwritten content
    </p>
  </motion.div>
);

export const ResultsProcessingState = (): React.ReactElement => (
  <motion.div
    key="processing"
    initial={false}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-1 flex-col items-center justify-center py-16"
  >
    <Spinner size="lg" />
    <p className="mt-4 font-medium text-foreground">Analyzing handwriting...</p>
    <p className="mt-1 text-muted text-sm">This may take a moment</p>
  </motion.div>
);

export const ResultsIdleState = (): React.ReactElement => (
  <motion.div
    key="idle"
    initial={false}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-1 flex-col items-center justify-center py-16 text-center"
  >
    <p className="text-muted">Upload a scan to see extracted content</p>
    <p className="mt-1 text-muted-light text-sm">
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
    initial={false}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-1 flex-col items-center justify-center py-16 text-center"
  >
    <p className="font-medium text-foreground">Processing failed</p>
    <p className="mt-1 text-muted text-sm">{message}</p>
  </motion.div>
);
