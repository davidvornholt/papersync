'use server';

import { Effect } from 'effect';
import {
  loadFromGitHubEffect,
  syncToGitHubEffect,
} from './sync-settings-github-effect';
import {
  loadFromLocalVaultEffect,
  syncToLocalVaultEffect,
} from './sync-settings-local-effect';
import type {
  LoadSettingsResult,
  SettingsToSync,
  SyncSettingsResult,
  VaultMethod,
} from './sync-settings-types';

export type {
  LoadSettingsResult,
  SettingsToSync,
  SyncSettingsResult,
  VaultMethod,
} from './sync-settings-types';

export const syncSettingsToVault = async (
  settings: SettingsToSync,
  method: VaultMethod,
  options: {
    localPath?: string;
    githubToken?: string;
    githubRepo?: string;
  },
): Promise<SyncSettingsResult> => {
  if (method === 'local') {
    if (!options.localPath) {
      return { success: false, error: 'Vault path not configured' };
    }
    return Effect.runPromise(
      syncToLocalVaultEffect(settings, options.localPath).pipe(
        Effect.map((paths) => ({ success: true as const, paths })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  if (method === 'github') {
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
      syncToGitHubEffect(settings, options.githubToken, owner, repo).pipe(
        Effect.map((paths) => ({ success: true as const, paths })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  return { success: false, error: 'Invalid vault method' };
};

export const loadSettingsFromVault = async (
  method: VaultMethod,
  options: {
    localPath?: string;
    githubToken?: string;
    githubRepo?: string;
  },
): Promise<LoadSettingsResult> => {
  if (method === 'local') {
    if (!options.localPath) {
      return { success: false, error: 'Vault path not configured' };
    }
    return Effect.runPromise(
      loadFromLocalVaultEffect(options.localPath).pipe(
        Effect.map((data) => ({ success: true as const, ...data })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  if (method === 'github') {
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
      loadFromGitHubEffect(options.githubToken, owner, repo).pipe(
        Effect.map((data) => ({ success: true as const, ...data })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  return { success: false, error: 'Invalid vault method' };
};
