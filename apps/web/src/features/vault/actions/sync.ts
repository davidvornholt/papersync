'use server';

import { Effect } from 'effect';
import type { WeekId } from '@/shared/types';
import { syncToGitHubEffect } from './sync-github-effect';
import { type ExtractedEntry, getCurrentWeekId } from './sync-helpers';
import { syncToLocalVaultEffect } from './sync-local-effect';
import type { SyncOptions, SyncResult } from './sync-types';

export type {
  ExtractedEntry,
  SyncOptions,
  SyncResult,
  VaultMethod,
} from './sync-types';

export const syncToVault = async (
  entries: readonly ExtractedEntry[],
  vaultPath: string,
  weekId?: WeekId,
): Promise<SyncResult> => {
  const effectiveWeekId = weekId ?? getCurrentWeekId();
  return Effect.runPromise(
    syncToLocalVaultEffect(entries, vaultPath, effectiveWeekId).pipe(
      Effect.map((notePath) => ({ success: true as const, notePath })),
      Effect.catchAll((error) =>
        Effect.succeed({ success: false as const, error: error.message }),
      ),
    ),
  );
};

export const syncEntriesToVault = async (
  entries: readonly ExtractedEntry[],
  options: SyncOptions,
): Promise<SyncResult> => {
  const effectiveWeekId = options.weekId ?? getCurrentWeekId();

  if (entries.length === 0) {
    return { success: false, error: 'No entries to sync' };
  }

  if (options.method === 'local') {
    if (!options.localPath) {
      return { success: false, error: 'Vault path not configured' };
    }
    return syncToVault(entries, options.localPath, effectiveWeekId);
  }

  if (options.method === 'github') {
    if (!options.githubToken) {
      return { success: false, error: 'GitHub not connected' };
    }
    if (!options.githubRepo) {
      return { success: false, error: 'GitHub repository not selected' };
    }

    const [owner, repo] = options.githubRepo.split('/');
    if (!owner || !repo) {
      return { success: false, error: 'Invalid repository name' };
    }

    return Effect.runPromise(
      syncToGitHubEffect(
        entries,
        options.githubToken,
        owner,
        repo,
        effectiveWeekId,
      ).pipe(
        Effect.map((notePath) => ({ success: true as const, notePath })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  return { success: false, error: 'Invalid vault method' };
};
