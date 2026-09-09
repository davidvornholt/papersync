import { Effect, Schema } from 'effect';
import { SubjectsConfig } from '@/shared/types/schemas';
import { GitHubSyncError } from '@/shared/vault/errors/sync-settings-types';
import {
  getSubjectsPath,
  getTimetablePath,
} from '@/shared/vault/services/config-paths';
import { GitHubServiceLive } from '@/shared/vault/services/github';
import {
  type GitHubFile,
  GitHubService,
} from '@/shared/vault/services/github-contract';
import { mergeSubjects, mergeTimetable } from './sync-settings-merge';
import type { SettingsToSync } from './sync-settings-types';

const timetableSchema = Schema.Array(
  Schema.Struct({
    day: Schema.String,
    slots: Schema.Array(
      Schema.Struct({ id: Schema.String, subjectId: Schema.String }),
    ),
  }),
);
const decodeFile = <A, I>(
  file: GitHubFile | null,
  schema: Schema.Schema<A, I>,
  fallback: A,
) =>
  file
    ? Schema.decodeUnknown(Schema.parseJson(schema))(file.content)
    : Effect.succeed(fallback);
const mapError = (cause: unknown) =>
  new GitHubSyncError({
    message:
      'Could not read or save the repository configuration. Check the file format and repository access.',
    cause,
  });

export const syncToGitHubEffect = (
  settings: SettingsToSync,
  token: string,
  owner: string,
  repo: string,
) =>
  Effect.gen(function* () {
    const github = yield* GitHubService;
    const destination = { token, owner, repo };
    const subjectsPath = getSubjectsPath();
    const timetablePath = getTimetablePath();
    const subjectsFile = yield* github.getFile({
      ...destination,
      path: subjectsPath,
    });
    const timetableFile = yield* github.getFile({
      ...destination,
      path: timetablePath,
    });
    const subjects = yield* decodeFile(subjectsFile, SubjectsConfig, []);
    const timetable = yield* decodeFile(timetableFile, timetableSchema, []);
    yield* github.setFile({
      ...destination,
      path: subjectsPath,
      content: JSON.stringify(
        mergeSubjects(subjects, settings.subjects),
        null,
        2,
      ),
      message: 'Update subjects configuration',
      sha: subjectsFile?.sha,
    });
    yield* github.setFile({
      ...destination,
      path: timetablePath,
      content: JSON.stringify(
        mergeTimetable(timetable, settings.timetable),
        null,
        2,
      ),
      message: 'Update timetable configuration',
      sha: timetableFile?.sha,
    });
    return [subjectsPath, timetablePath] as const;
  }).pipe(Effect.provide(GitHubServiceLive), Effect.mapError(mapError));

export const loadFromGitHubEffect = (
  token: string,
  owner: string,
  repo: string,
) =>
  Effect.gen(function* () {
    const github = yield* GitHubService;
    const subjectsFile = yield* github.getFile({
      token,
      owner,
      repo,
      path: getSubjectsPath(),
    });
    const timetableFile = yield* github.getFile({
      token,
      owner,
      repo,
      path: getTimetablePath(),
    });
    return {
      subjects: yield* decodeFile(subjectsFile, SubjectsConfig, []),
      timetable: yield* decodeFile(timetableFile, timetableSchema, []),
    };
  }).pipe(Effect.provide(GitHubServiceLive), Effect.mapError(mapError));
