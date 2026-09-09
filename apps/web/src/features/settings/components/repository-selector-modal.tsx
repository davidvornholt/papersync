'use client';

import { Button } from '@papersync/ui/button';
import { Effect } from 'effect';
import { ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/shared/components/modal';
import { requestAction } from '@/shared/http/action';
import { listGitHubRepositories } from '../actions/github-oauth';
import type { GitHubRepository } from '../actions/github-oauth-types';
import {
  RepositoryEmptyState,
  RepositoryErrorState,
  RepositoryLoadingState,
} from './repository-selector-modal-states';

type RepositorySelectorModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelect: (repo: GitHubRepository) => void;
  readonly accessToken: string;
};

export const RepositorySelectorModal = ({
  isOpen,
  onClose,
  onSelect,
  accessToken,
}: RepositorySelectorModalProps): React.ReactElement => {
  const [repositories, setRepositories] = useState<Array<GitHubRepository>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRepositories = useCallback(() => {
    setIsLoading(true);
    setError(null);

    Effect.runFork(
      requestAction(() => listGitHubRepositories(accessToken)).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (result.success) {
              setRepositories([...result.repositories]);
            } else {
              setError(result.error);
            }
          }),
        ),
        Effect.catchAll((failure) =>
          Effect.sync(() => setError(failure.message)),
        ),
        Effect.ensuring(Effect.sync(() => setIsLoading(false))),
      ),
    );
  }, [accessToken]);

  useEffect(() => {
    if (isOpen && accessToken) {
      fetchRepositories();
    }
  }, [isOpen, accessToken, fetchRepositories]);

  const filteredRepositories = useMemo(
    () =>
      repositories.filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          repo.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [repositories, searchQuery],
  );

  const handleSelect = useCallback(
    (repo: GitHubRepository) => {
      onSelect(repo);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Repository"
      description="Choose a repository to use as your Obsidian vault"
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-2 border-hairline-strong border-b pb-2">
          <div className="relative flex-1">
            <Search
              aria-hidden={true}
              className="absolute top-1/2 left-0 size-4 -translate-y-1/2 text-graphite"
            />
            <input
              type="text"
              placeholder="Search repositories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-0 bg-transparent py-2 pr-2 pl-7 text-[14px] text-ink placeholder:text-mute focus:outline-none"
              aria-label="Search repositories"
            />
          </div>
          <button
            type="button"
            onClick={fetchRepositories}
            disabled={isLoading}
            className="cursor-pointer touch-manipulation p-2 text-graphite transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            title="Refresh repositories"
            aria-label="Refresh repositories"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </button>
        </div>

        <div className="-mx-1 max-h-[60vh] overflow-y-auto sm:max-h-[400px]">
          {isLoading ? <RepositoryLoadingState /> : null}
          {!isLoading && error ? (
            <RepositoryErrorState error={error} onRetry={fetchRepositories} />
          ) : null}
          {!(isLoading || error) && filteredRepositories.length === 0 ? (
            <RepositoryEmptyState hasSearchQuery={searchQuery.length > 0} />
          ) : null}
          {!(isLoading || error) && filteredRepositories.length > 0 ? (
            <ul>
              <AnimatePresence mode="popLayout">
                {filteredRepositories.map((repo) => (
                  <motion.li
                    key={repo.id}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(repo)}
                      className="group w-full cursor-pointer touch-manipulation border-hairline border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-paper-deep/60 focus-visible:bg-paper-deep/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="serif truncate text-[16px] text-ink tracking-[-0.018em] transition-colors group-hover:text-accent">
                              {repo.name}
                            </span>
                            {repo.private ? (
                              <span className="mono border border-hairline-strong px-1.5 py-0.5 text-[10px] text-graphite uppercase tracking-[0.18em]">
                                Private
                              </span>
                            ) : null}
                          </div>
                          <p className="mono mt-0.5 truncate text-[11px] text-graphite">
                            {repo.fullName}
                          </p>
                          {repo.description ? (
                            <p className="mt-1 line-clamp-2 text-[13px] text-graphite">
                              {repo.description}
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight
                          aria-hidden={true}
                          className="mt-1 size-4 flex-shrink-0 text-graphite transition-colors group-hover:text-accent"
                        />
                      </div>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : null}
        </div>

        <div className="flex justify-end border-hairline border-t pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
