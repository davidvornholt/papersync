import { Effect, Schema } from 'effect';
import { SettingsStorageError } from './settings-storage-error';
import {
  defaultSettings,
  type Settings,
  SettingsSchema,
} from './use-settings-schema';

const storageKey = 'papersync-settings';
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
        ? Schema.decodeUnknown(Schema.parseJson(SettingsSchema))(stored)
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
