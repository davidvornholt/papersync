import { Effect } from 'effect';
import type { SubjectsConfig } from '@/shared/types';
import type { TimetableConfig } from '../services/config';
import { getSubjectsPath, getTimetablePath } from '../services/config';
import { GitHubService, GitHubServiceLive } from '../services/github';
import { mergeSubjects, mergeTimetable } from './sync-settings-merge';
import {
  GitHubSyncError,
  type SettingsToSync,
  type SyncSettingsValidationError,
} from './sync-settings-types';

const getFileShaEffect = (
  token: string,
  owner: string,
  repo: string,
  filePath: string,
): Effect.Effect<string | undefined, never> =>
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
        if (!response.ok) {
          return undefined;
        }
        return response.json().then((data) => data.sha as string);
      }),
    catch: () => undefined,
  }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

export const syncToGitHubEffect = (
  settings: SettingsToSync,
  token: string,
  owner: string,
  repo: string,
): Effect.Effect<
  readonly string[],
  SyncSettingsValidationError | GitHubSyncError
> =>
  Effect.gen(function* () {
    const subjectsPath = getSubjectsPath();
    const timetablePath = getTimetablePath();
    const github = yield* GitHubService;

    const existingSubjectsContent = yield* github
      .getFileContent(token, owner, repo, subjectsPath)
      .pipe(Effect.catchAll(() => Effect.succeed(null)));
    const existingTimetableContent = yield* github
      .getFileContent(token, owner, repo, timetablePath)
      .pipe(Effect.catchAll(() => Effect.succeed(null)));

    const existingSubjects: SubjectsConfig = existingSubjectsContent
      ? JSON.parse(existingSubjectsContent)
      : [];
    const existingTimetable: TimetableConfig = existingTimetableContent
      ? JSON.parse(existingTimetableContent)
      : [];

    const mergedSubjects = mergeSubjects(existingSubjects, settings.subjects);
    const mergedTimetable = mergeTimetable(
      existingTimetable,
      settings.timetable,
    );

    const subjectsSha = yield* getFileShaEffect(
      token,
      owner,
      repo,
      subjectsPath,
    );
    const timetableSha = yield* getFileShaEffect(
      token,
      owner,
      repo,
      timetablePath,
    );

    yield* github.createOrUpdateFile(
      token,
      owner,
      repo,
      subjectsPath,
      JSON.stringify(mergedSubjects, null, 2),
      'Update subjects configuration',
      subjectsSha,
    );
    yield* github.createOrUpdateFile(
      token,
      owner,
      repo,
      timetablePath,
      JSON.stringify(mergedTimetable, null, 2),
      'Update timetable configuration',
      timetableSha,
    );

    return [subjectsPath, timetablePath] as const;
  }).pipe(
    Effect.provide(GitHubServiceLive),
    Effect.catchTag('GitHubAPIError', (error) =>
      Effect.fail(
        new GitHubSyncError({ message: error.message, cause: error }),
      ),
    ),
  );

export const loadFromGitHubEffect = (
  token: string,
  owner: string,
  repo: string,
): Effect.Effect<
  { readonly subjects: SubjectsConfig; readonly timetable: TimetableConfig },
  GitHubSyncError
> =>
  Effect.gen(function* () {
    const subjectsPath = getSubjectsPath();
    const timetablePath = getTimetablePath();
    const github = yield* GitHubService;

    const subjectsContent = yield* github.getFileContent(
      token,
      owner,
      repo,
      subjectsPath,
    );
    const timetableContent = yield* github.getFileContent(
      token,
      owner,
      repo,
      timetablePath,
    );

    return {
      subjects: subjectsContent
        ? (JSON.parse(subjectsContent) as SubjectsConfig)
        : [],
      timetable: timetableContent
        ? (JSON.parse(timetableContent) as TimetableConfig)
        : [],
    };
  }).pipe(
    Effect.provide(GitHubServiceLive),
    Effect.catchTag('GitHubAPIError', (error) =>
      Effect.fail(
        new GitHubSyncError({ message: error.message, cause: error }),
      ),
    ),
  );
