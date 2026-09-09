import { Effect } from 'effect';
import type { SubjectsConfig } from '@/shared/types/schemas';
import type {
  VaultError,
  VaultFileNotFoundError,
} from '@/shared/vault/errors/filesystem-errors';
import { SyncSettingsValidationError } from '@/shared/vault/errors/sync-settings-types';
import {
  readSubjects,
  readTimetable,
  type TimetableConfig,
  writeSubjects,
  writeTimetable,
} from '@/shared/vault/services/config-json';
import {
  getSubjectsPath,
  getTimetablePath,
} from '@/shared/vault/services/config-paths';
import { makeLocalVaultLayer } from '../services/filesystem';
import { mergeSubjects, mergeTimetable } from './sync-settings-merge';
import type { SettingsToSync } from './sync-settings-types';
export const syncToLocalVaultEffect = (
  settings: SettingsToSync,
  vaultPath: string,
): Effect.Effect<
  ReadonlyArray<string>,
  SyncSettingsValidationError | VaultError
> =>
  Effect.gen(function* () {
    if (!vaultPath) {
      return yield* Effect.fail(
        new SyncSettingsValidationError({
          message: 'Vault path not configured',
        }),
      );
    }

    const existingSubjects = yield* readSubjects().pipe(
      Effect.catchAll(() => Effect.succeed([] as SubjectsConfig)),
    );
    const existingTimetable = yield* readTimetable().pipe(
      Effect.catchAll(() => Effect.succeed([] as TimetableConfig)),
    );

    yield* writeSubjects(mergeSubjects(existingSubjects, settings.subjects));
    yield* writeTimetable(
      mergeTimetable(existingTimetable, settings.timetable),
    );

    return [getSubjectsPath(), getTimetablePath()] as const;
  }).pipe(Effect.provide(makeLocalVaultLayer(vaultPath)));

export const loadFromLocalVaultEffect = (
  vaultPath: string,
): Effect.Effect<
  { readonly subjects: SubjectsConfig; readonly timetable: TimetableConfig },
  SyncSettingsValidationError | VaultError | VaultFileNotFoundError
> =>
  Effect.gen(function* () {
    if (!vaultPath) {
      return yield* Effect.fail(
        new SyncSettingsValidationError({
          message: 'Vault path not configured',
        }),
      );
    }

    const subjects = yield* readSubjects();
    const timetable = yield* readTimetable();
    return { subjects, timetable };
  }).pipe(Effect.provide(makeLocalVaultLayer(vaultPath)));
