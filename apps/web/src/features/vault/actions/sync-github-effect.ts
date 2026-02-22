import { Effect } from 'effect';
import type { WeekId } from '@/shared/types';
import {
  generateOverviewContent,
  getOverviewPath,
  getWeeklyNotePath,
  parseWeeklyNoteMarkdown,
  serializeWeeklyNoteToMarkdown,
} from '../services/config';
import { GitHubService, GitHubServiceLive } from '../services/github';
import {
  convertEntriesToWeeklyNote,
  type ExtractedEntry,
} from './sync-helpers';
import {
  GitHubFileError,
  GitHubFileNotFound,
  SyncValidationError,
} from './sync-types';

type GitHubFileContent = {
  readonly content: string;
  readonly sha: string;
};

const fetchGitHubFileEffect = (
  token: string,
  owner: string,
  repo: string,
  filePath: string,
): Effect.Effect<GitHubFileContent, GitHubFileError | GitHubFileNotFound> =>
  Effect.tryPromise({
    try: () =>
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      ).then((response) => {
        if (response.status === 404) {
          return Promise.reject({ _tag: 'not_found', path: filePath });
        }
        if (!response.ok) {
          return response.text().then((errorText) =>
            Promise.reject({
              _tag: 'error',
              status: response.status,
              message: `GitHub API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`,
            }),
          );
        }

        return response.json().then((data) => {
          if (data.content && data.sha) {
            return {
              content: Buffer.from(data.content, 'base64').toString('utf-8'),
              sha: data.sha,
            };
          }
          return Promise.reject({
            _tag: 'error',
            message: 'Invalid response from GitHub API',
          });
        });
      }),
    catch: (error): GitHubFileError | GitHubFileNotFound => {
      if (typeof error === 'object' && error !== null && '_tag' in error) {
        const taggedError = error as {
          _tag: string;
          path?: string;
          message?: string;
          status?: number;
        };
        if (taggedError._tag === 'not_found' && taggedError.path) {
          return new GitHubFileNotFound({ path: taggedError.path });
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

export const syncToGitHubEffect = (
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

    let existingNote = null;
    if (fileResult.found && fileResult.content) {
      existingNote = Effect.runSync(
        Effect.try({
          try: () => parseWeeklyNoteMarkdown(fileResult.content, weekId),
          catch: () => null,
        }),
      );
    }

    const weeklyNote = convertEntriesToWeeklyNote(
      entries,
      weekId,
      existingNote,
    );
    const github = yield* GitHubService;

    yield* github.createOrUpdateFile(
      token,
      owner,
      repo,
      notePath,
      serializeWeeklyNoteToMarkdown(weeklyNote),
      `Update weekly note: ${weekId}`,
      fileResult.found ? fileResult.sha : undefined,
    );

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
