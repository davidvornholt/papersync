import { Effect, Schema } from 'effect';
import { SettingsStorageError } from './settings-storage-error';
import {
  createDefaultTimetable,
  defaultSettings,
  type Settings,
  SettingsSchema,
} from './use-settings-schema';

const storageKey = 'papersync-settings';
const storedSettingsSchema = Schema.parseJson(
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
export const loadSettings = (): Effect.Effect<Settings> =>
  Effect.try({
    try: () => globalThis.localStorage.getItem(storageKey),
    catch: () =>
      new SettingsStorageError({
        message: 'Browser settings are unavailable.',
      }),
  }).pipe(
    Effect.flatMap((stored) =>
      stored
        ? Schema.decodeUnknown(storedSettingsSchema)(stored).pipe(
            Effect.map((parsed) =>
              'timetable' in parsed
                ? parsed
                : { ...parsed, timetable: createDefaultTimetable() },
            ),
            Effect.flatMap((migrated) =>
              Schema.decodeUnknown(SettingsSchema)(migrated),
            ),
          )
        : Effect.succeed(defaultSettings),
    ),
    Effect.orElseSucceed(() => defaultSettings),
  );

export const saveSettings = (settings: Settings) =>
  Effect.try({
    try: () =>
      globalThis.localStorage.setItem(storageKey, JSON.stringify(settings)),
    catch: () =>
      new SettingsStorageError({
        message:
          'Browser storage could not save your settings. Check available space and browser privacy settings.',
      }),
  });
