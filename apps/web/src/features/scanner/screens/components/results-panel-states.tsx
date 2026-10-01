'use client';

import { Button } from '@papersync/ui/button';
import { StateView } from '@/shared/components/motion-layout';
import { Spinner } from '@/shared/components/motion-loading';
import { NotifyWhenDone } from './notify-when-done';
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

export const ResultsProcessingState = ({
  isUploading,
  onCancel,
}: {
  readonly isUploading: boolean;
  readonly onCancel: () => void;
}): React.ReactElement => (
  <StateView
    key="processing"
    className="flex flex-1 flex-col items-center justify-center py-16 text-center"
  >
    <Spinner size="lg" />
    <p role="status" className="mt-4 font-medium text-foreground">
      {isUploading ? 'Uploading photos…' : 'Analyzing handwriting…'}
    </p>
    <p className="mt-1 max-w-xs text-muted text-sm">
      {isUploading
        ? 'Keep PaperSync open until the upload finishes.'
        : 'You can switch apps or lock your phone. The result will be here when you come back.'}
    </p>
    {isUploading ? null : <NotifyWhenDone />}
    <Button variant="ghost" className="mt-6" onClick={onCancel}>
      Cancel analysis
    </Button>
  </StateView>
);

export const ResultsIdleState = (): React.ReactElement => (
  <StateView
    key="idle"
    className="flex flex-1 flex-col items-center justify-center py-16 text-center"
  >
    <p className="text-muted">Add photos of the sheet to see its homework</p>
    <p className="mt-1 text-muted-light text-sm">
      Photograph the front and back; PaperSync reads them together
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
