'use server';

import { Effect } from 'effect';
import type { WeekId } from '@/app/shared/types';
import {
  generateOverviewContent,
  getOverviewPath,
  getWeeklyNotePath,
  parseWeeklyNoteMarkdown,
  readWeeklyNote,
  serializeWeeklyNoteToMarkdown,
  writeWeeklyNote,
} from '../services/config';
import { makeLocalVaultLayer, VaultService } from '../services/filesystem';
import { GitHubService, GitHubServiceLive } from '../services/github';
import {
  convertEntriesToWeeklyNote,
  type ExtractedEntry,
  getCurrentWeekId,
} from './sync-helpers';
import {
  GitHubFileError,
  GitHubFileNotFound,
  type SyncOptions,
  type SyncResult,
  SyncValidationError,
} from './sync-types';

/**
 * Server Actions for Vault Sync
 *
 * Note: Types and error classes are in sync-types.ts because
 * "use server" files can only export async functions.
 */

// Re-export types from the types file for convenience
export type {
  ExtractedEntry,
  SyncOptions,
  SyncResult,
  VaultMethod,
} from './sync-types';

// ============================================================================
// Internal Types
// ============================================================================

type GitHubFileContent = {
  readonly content: string;
  readonly sha: string;
};

// ============================================================================
// Effect-Based Implementations
// ============================================================================

const fetchGitHubFileEffect = (
  token: string,
  owner: string,
  repo: string,
  filePath: string,
): Effect.Effect<GitHubFileContent, GitHubFileError | GitHubFileNotFound> =>
  Effect.tryPromise({
    try: async () => {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      console.log(`[fetchGitHubFile] Fetching: ${url}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      console.log(
        `[fetchGitHubFile] Response status: ${response.status} ${response.statusText}`,
      );

      if (response.status === 404) {
        console.log(
          '[fetchGitHubFile] File not found (404) - this is OK for new vaults',
        );
        throw { _tag: 'not_found', path: filePath };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[fetchGitHubFile] API error: ${response.status} - ${errorText}`,
        );
        throw {
          _tag: 'error',
          status: response.status,
          message: `GitHub API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      if (data.content && data.sha) {
        console.log(
          `[fetchGitHubFile] File found, content length: ${data.content.length}, SHA: ${data.sha}`,
        );
        return {
          content: Buffer.from(data.content, 'base64').toString('utf-8'),
          sha: data.sha,
        };
      }

      console.error(
        '[fetchGitHubFile] Invalid response - missing content or sha',
      );
      throw { _tag: 'error', message: 'Invalid response from GitHub API' };
    },
    catch: (error): GitHubFileError | GitHubFileNotFound => {
      if (typeof error === 'object' && error !== null && '_tag' in error) {
        const taggedError = error as {
          _tag: string;
          path?: string;
          message?: string;
          status?: number;
        };
        if (taggedError._tag === 'not_found' && taggedError.path) {
          return new GitHubFileNotFound({
            path: taggedError.path,
          });
        }
        return new GitHubFileError({
          message: taggedError.message ?? 'Unknown GitHub error',
          status: taggedError.status,
        });
      }
      return new GitHubFileError({
        message: error instanceof Error ? error.message : 'Network error',
        cause: error,
      });
    },
  });

const syncToLocalVaultEffect = (
  entries: readonly ExtractedEntry[],
  vaultPath: string,
  weekId: WeekId,
): Effect.Effect<string, SyncValidationError | Error> =>
  Effect.gen(function* () {
    if (entries.length === 0) {
      return yield* Effect.fail(
        new SyncValidationError({ message: 'No entries to sync' }),
      );
    }

    if (!vaultPath) {
      return yield* Effect.fail(
        new SyncValidationError({ message: 'Vault path not configured' }),
      );
    }

    // Read existing note if present
    const existingNote = yield* readWeeklyNote(weekId).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );

    // Convert entries to weekly note format, merging with existing
    const weeklyNote = convertEntriesToWeeklyNote(
      entries,
      weekId,
      existingNote,
    );

    // Write the updated note
    yield* writeWeeklyNote(weeklyNote);

    // Create Overview.md if it doesn't exist
    const vault = yield* VaultService;
    const overviewPath = getOverviewPath();
    const overviewExists = yield* vault.fileExists(overviewPath);
    if (!overviewExists) {
      yield* vault.writeFile(overviewPath, generateOverviewContent());
    }

    return getWeeklyNotePath(weekId);
  }).pipe(Effect.provide(makeLocalVaultLayer(vaultPath)));

const syncToGitHubEffect = (
  entries: readonly ExtractedEntry[],
  token: string,
  owner: string,
  repo: string,
  weekId: WeekId,
): Effect.Effect<string, SyncValidationError | GitHubFileError | Error> =>
  Effect.gen(function* () {
    if (entries.length === 0) {
      return yield* Effect.fail(
        new SyncValidationError({ message: 'No entries to sync' }),
      );
    }

    const notePath = getWeeklyNotePath(weekId);
    console.log(
      `[syncToGitHub] Syncing ${entries.length} entries to ${owner}/${repo}/${notePath}`,
    );

    // Fetch existing file, treating not found as success with null
    const fileResult = yield* fetchGitHubFileEffect(
      token,
      owner,
      repo,
      notePath,
    ).pipe(
      Effect.map((content) => ({ found: true as const, ...content })),
      Effect.catchTag('GitHubFileNotFound', () =>
        Effect.succeed({
          found: false as const,
          content: null,
          sha: undefined,
        }),
      ),
    );

    console.log(`[syncToGitHub] File result found: ${fileResult.found}`);

    // Parse existing note if file exists
    let existingNote = null;
    if (fileResult.found && fileResult.content) {
      existingNote = Effect.runSync(
        Effect.try({
          try: () => parseWeeklyNoteMarkdown(fileResult.content, weekId),
          catch: () => {
            console.warn(
              '[syncToGitHub] Failed to parse existing note, starting fresh',
            );
            return null;
          },
        }),
      );
    }

    // Convert entries to weekly note format
    const weeklyNote = convertEntriesToWeeklyNote(
      entries,
      weekId,
      existingNote,
    );

    // Serialize to markdown
    const markdown = serializeWeeklyNoteToMarkdown(weeklyNote);

    const github = yield* GitHubService;

    yield* github.createOrUpdateFile(
      token,
      owner,
      repo,
      notePath,
      markdown,
      `Update weekly note: ${weekId}`,
      fileResult.found ? fileResult.sha : undefined,
    );

    // Create Overview.md if it doesn't exist
    const overviewPath = getOverviewPath();
    const overviewResult = yield* fetchGitHubFileEffect(
      token,
      owner,
      repo,
      overviewPath,
    ).pipe(
      Effect.map(() => ({ found: true })),
      Effect.catchTag('GitHubFileNotFound', () =>
        Effect.succeed({ found: false }),
      ),
    );

    if (!overviewResult.found) {
      yield* github.createOrUpdateFile(
        token,
        owner,
        repo,
        overviewPath,
        generateOverviewContent(),
        'Create homework overview',
        undefined,
      );
    }

    return notePath;
  }).pipe(Effect.provide(GitHubServiceLive));

// ============================================================================
// Server Actions (Public API)
// ============================================================================

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
