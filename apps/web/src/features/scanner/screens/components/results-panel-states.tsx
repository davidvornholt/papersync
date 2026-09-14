'use client';

import { StateView } from '@/shared/components/motion-layout';
import { Spinner } from '@/shared/components/motion-loading';
export const ResultsEmptyState = (): React.ReactElement => (
  <StateView
    key="empty"
    className="flex flex-1 flex-col items-center justify-center py-16 text-center"
  >
    <p className="font-medium text-foreground">No new entries detected</p>
    <p className="mt-1 text-muted text-sm">
      The scan may not contain handwritten content
    </p>
  </StateView>
);

export const ResultsProcessingState = (): React.ReactElement => (
  <StateView
    key="processing"
    className="flex flex-1 flex-col items-center justify-center py-16"
  >
    <Spinner size="lg" />
    <p className="mt-4 font-medium text-foreground">Analyzing handwriting...</p>
    <p className="mt-1 text-muted text-sm">This may take a moment</p>
  </StateView>
);

export const ResultsIdleState = (): React.ReactElement => (
  <StateView
    key="idle"
    className="flex flex-1 flex-col items-center justify-center py-16 text-center"
  >
    <p className="text-muted">Upload a scan to see extracted content</p>
    <p className="mt-1 text-muted-light text-sm">
      AI will detect and extract handwritten entries
    </p>
  </StateView>
);

export const ResultsErrorState = ({
  message,
}: {
  readonly message: string;
}): React.ReactElement => (
  <StateView
    key="error"
    className="flex flex-1 flex-col items-center justify-center py-16 text-center"
  >
    <p className="font-medium text-foreground">Processing failed</p>
    <p className="mt-1 text-muted text-sm">{message}</p>
  </StateView>
);
