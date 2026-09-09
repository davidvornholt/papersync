import { Button } from '@papersync/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@/shared/components/motion-loading';
export const RepositoryLoadingState = (): React.ReactElement => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
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
  <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
    <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft/60">
      <AlertTriangle className="size-5 text-accent" aria-hidden={true} />
    </div>
    <p className="max-w-xs text-[13px] text-accent">{error}</p>
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
  <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
    <p className="serif-italic text-[14px] text-graphite">
      {hasSearchQuery
        ? 'No repositories match your search'
        : 'No repositories found'}
    </p>
  </div>
);
