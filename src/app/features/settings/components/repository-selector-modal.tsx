'use client';

import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Spinner } from '@/app/shared/components';
import type { GitHubRepository } from '../actions/github-oauth-types';
import { listGitHubRepositories } from '../actions/github-oauth';

// ============================================================================
// Types
// ============================================================================

type RepositorySelectorModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelect: (repo: GitHubRepository) => void;
  readonly accessToken: string;
};

// ============================================================================
// Component
// ============================================================================

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

  // Load repositories when modal opens
  useEffect(() => {
    if (isOpen && accessToken) {
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
    }
  }, [isOpen, accessToken]);

  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelect = useCallback(
    (repo: GitHubRepository) => {
      onSelect(repo);
      onClose();
    },
    [onSelect, onClose],
  );

  const refreshRepositories = useCallback(() => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Repository"
      description="Choose a repository to use as your Obsidian vault"
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Search Input with Refresh */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={refreshRepositories}
            disabled={isLoading}
            className="p-2.5 rounded-lg border border-border bg-surface hover:bg-accent/5 hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh repositories"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-muted animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 text-muted" />
            )}
          </button>
        </div>

        {/* Repository List */}
        <div className="max-h-[400px] overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner size="md" />
              <p className="text-sm text-muted">Loading repositories...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
              <p className="text-sm text-error">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={refreshRepositories}
              >
                Try Again
              </Button>
            </div>
          ) : filteredRepositories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-muted">
                {searchQuery
                  ? 'No repositories match your search'
                  : 'No repositories found'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <AnimatePresence mode="popLayout">
                {filteredRepositories.map((repo) => (
                  <motion.button
                    key={repo.id}
                    type="button"
                    onClick={() => handleSelect(repo)}
                    className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-accent hover:bg-accent/5 transition-all group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground group-hover:text-accent transition-colors truncate">
                            {repo.name}
                          </span>
                          {repo.private && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-muted/10 text-muted rounded">
                              Private
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {repo.fullName}
                        </p>
                        {repo.description && (
                          <p className="text-xs text-muted/70 mt-1 line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border/50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
