import { Button } from '@papersync/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@/shared/components/motion';

export const RepositoryLoadingState = (): React.ReactElement => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <Spinner size="md" />
    <p className="text-[13px] text-graphite">Loading repositories…</p>
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
  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
    <div className="w-12 h-12 rounded-full bg-accent-soft/60 flex items-center justify-center">
      <AlertTriangle className="w-5 h-5 text-accent" aria-hidden />
    </div>
    <p className="text-[13px] text-accent max-w-xs">{error}</p>
    <Button variant="secondary" size="sm" onClick={onRetry}>
      Try again
    </Button>
  </div>
);

export const RepositoryEmptyState = ({
  hasSearchQuery,
}: {
  readonly hasSearchQuery: boolean;
}): React.ReactElement => (
  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
    <p className="serif-italic text-[14px] text-graphite">
      {hasSearchQuery
        ? 'No repositories match your search'
        : 'No repositories found'}
    </p>
  </div>
);
