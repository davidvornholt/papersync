import { Effect } from 'effect';
import type { SubjectsConfig } from '@/shared/types/schemas';
import type { TimetableConfig } from '../services/config';
import {
  getSubjectsPath,
  getTimetablePath,
  readSubjects,
  readTimetable,
  writeSubjects,
  writeTimetable,
} from '../services/config';
import {
  makeLocalVaultLayer,
  type VaultError,
  type VaultFileNotFoundError,
} from '../services/filesystem';
import { mergeSubjects, mergeTimetable } from './sync-settings-merge';
import type { SettingsToSync } from './sync-settings-types';
import { SyncSettingsValidationError } from './sync-settings-types';

export const syncToLocalVaultEffect = (
  settings: SettingsToSync,
  vaultPath: string,
): Effect.Effect<readonly string[], SyncSettingsValidationError | VaultError> =>
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
