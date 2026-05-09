'use client';

import { Button } from '@papersync/ui/button';
import { ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/shared/components/modal';
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
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRepositories = useCallback(() => {
    setIsLoading(true);
    setError(null);

    listGitHubRepositories(accessToken).then((result) => {
      if (result.success) {
        setRepositories([...result.repositories]);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    });
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
        <div className="flex items-end gap-2 pb-2 border-b border-hairline-strong">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite"
            />
            <input
              type="text"
              placeholder="Search repositories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-7 pr-2 py-2 text-[14px] text-ink placeholder:text-mute border-0 focus:outline-none"
              aria-label="Search repositories"
            />
          </div>
          <button
            type="button"
            onClick={fetchRepositories}
            disabled={isLoading}
            className="p-2 text-graphite hover:text-ink transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            title="Refresh repositories"
            aria-label="Refresh repositories"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto -mx-1">
          {isLoading ? (
            <RepositoryLoadingState />
          ) : error ? (
            <RepositoryErrorState error={error} onRetry={fetchRepositories} />
          ) : filteredRepositories.length === 0 ? (
            <RepositoryEmptyState hasSearchQuery={searchQuery.length > 0} />
          ) : (
            <ul>
              <AnimatePresence mode="popLayout">
                {filteredRepositories.map((repo) => (
                  <motion.li
                    key={repo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(repo)}
                      className="w-full text-left px-4 py-3 border-b border-hairline last:border-b-0 hover:bg-paper-deep/60 focus-visible:bg-paper-deep/60 transition-colors cursor-pointer touch-manipulation group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="serif text-[16px] tracking-[-0.018em] text-ink group-hover:text-accent transition-colors truncate">
                              {repo.name}
                            </span>
                            {repo.private && (
                              <span className="mono text-[10px] uppercase tracking-[0.18em] text-graphite border border-hairline-strong px-1.5 py-0.5">
                                Private
                              </span>
                            )}
                          </div>
                          <p className="mono text-[11px] text-graphite mt-0.5 truncate">
                            {repo.fullName}
                          </p>
                          {repo.description && (
                            <p className="text-[13px] text-graphite mt-1 line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          aria-hidden
                          className="w-4 h-4 text-graphite group-hover:text-accent transition-colors flex-shrink-0 mt-1"
                        />
                      </div>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-hairline">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
