'use server';

import { databaseRuntime } from '@papersync/db/runtime';
import { Effect } from 'effect';
import { requireSession } from '@/shared/auth/session';
import { enqueueHomework } from '@/shared/homework/queue';
import { getWeekId as getCurrentWeekId } from '@/shared/planner/week';
import type { WeekId } from '@/shared/types/schemas';
import type { ExtractedEntry } from '@/shared/vault/actions/sync-helpers-types';
import { syncToGitHubEffect } from './sync-github-effect';
import { syncToLocalVaultEffect } from './sync-local-effect';
import type { SyncOptions, SyncResult } from './sync-types';
export const syncToVault = async (
  entries: ReadonlyArray<ExtractedEntry>,
  vaultPath: string,
  weekId?: WeekId,
): Promise<SyncResult> => {
  await requireSession();
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
  entries: ReadonlyArray<ExtractedEntry>,
  options: SyncOptions,
): Promise<SyncResult> => {
  await requireSession();
  const effectiveWeekId = options.weekId ?? getCurrentWeekId();

  if (entries.length === 0) {
    return { success: false, error: 'No entries to sync' };
  }

  if (options.method === 'local') {
    const normalizedPath = options.localPath?.trim();
    if (!normalizedPath) {
      return { success: false, error: 'Vault path not configured' };
    }
    return syncToVault(entries, normalizedPath, effectiveWeekId);
  }

  if (options.method === 'github') {
    if (!options.githubToken) {
      return { success: false, error: 'GitHub not connected' };
    }
    if (!options.githubRepo) {
      return { success: false, error: 'GitHub repository not selected' };
    }

    const [owner, repo] = options.githubRepo.split('/');
    if (!(owner && repo)) {
      return { success: false, error: 'Invalid repository name' };
    }

    return Effect.runPromise(
      syncToGitHubEffect(entries, {
        token: options.githubToken,
        owner,
        repo,
        weekId: effectiveWeekId,
      }).pipe(
        Effect.map((notePath) => ({ success: true as const, notePath })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  if (options.method === 'super-productivity') {
    return databaseRuntime.runPromise(
      enqueueHomework(entries, {
        weekId: effectiveWeekId,
        projectId: options.superProductivityProjectId,
        tagIds: options.superProductivityTagIds,
      }).pipe(
        Effect.map((count) => ({
          success: true as const,
          notePath: `${count} tasks waiting for Super Productivity`,
        })),
        Effect.catchAll(() =>
          Effect.succeed({
            success: false as const,
            error: 'Could not queue homework. Check the entries and try again.',
          }),
        ),
      ),
    );
  }

  return { success: false, error: 'Invalid vault method' };
};
