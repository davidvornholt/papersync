import { AlertTriangle } from 'lucide-react';
import { Button, Spinner } from '@/shared/components';

export const RepositoryLoadingState = (): React.ReactElement => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <Spinner size="md" />
    <p className="text-sm text-muted">Loading repositories...</p>
  </div>
);

type RepositoryErrorStateProps = {
  readonly error: string;
  readonly onRetry: () => void;
};

export const RepositoryErrorState = ({
  error,
  onRetry,
}: RepositoryErrorStateProps): React.ReactElement => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
      <AlertTriangle className="w-6 h-6 text-error" />
    </div>
    <p className="text-sm text-error">{error}</p>
    <Button variant="secondary" size="sm" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

export const RepositoryEmptyState = ({
  hasSearchQuery,
}: {
  readonly hasSearchQuery: boolean;
}): React.ReactElement => (
  <div className="flex flex-col items-center justify-center py-12 gap-2">
    <p className="text-muted">
      {hasSearchQuery
        ? 'No repositories match your search'
        : 'No repositories found'}
    </p>
  </div>
);
