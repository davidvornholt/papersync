import { Effect, Schema } from 'effect';
import {
  createDefaultTimetable,
  defaultSettings,
  type Settings,
  SettingsSchema,
  StoredSchoolSettingsSchema,
} from '../settings/schema';
import { SettingsStorageError } from './settings-storage-error';

const storageKey = 'papersync-settings';
const storedSettingsSchema = Schema.parseJson(
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);

const loadBrowserSettings = () =>
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
            Effect.flatMap((parsed) =>
              Schema.decodeUnknown(SettingsSchema)({
                ...defaultSettings,
                ...parsed,
                timetable: parsed.timetable ?? createDefaultTimetable(),
              }),
            ),
          )
        : Effect.succeed(defaultSettings),
    ),
    Effect.orElseSucceed(() => defaultSettings),
  );

const requestSettings = (init: RequestInit) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch('/api/settings', {
        ...init,
        cache: 'no-store',
        redirect: 'error',
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = Schema.decodeUnknownSync(
          Schema.Struct({ error: Schema.String }),
        )(body);
        throw new SettingsStorageError({ message: error.error });
      }
      return Schema.decodeUnknownSync(StoredSchoolSettingsSchema)(body);
    },
    catch: (cause) =>
      cause instanceof SettingsStorageError
        ? cause
        : new SettingsStorageError({
            message:
              'Could not load or save your timetable. Check your connection and sign-in, then retry.',
          }),
  });

export const loadSettings = () =>
  Effect.gen(function* () {
    const remote = yield* requestSettings({ method: 'GET' });
    const local = yield* loadBrowserSettings();
    return {
      settings: { ...local, ...(remote.school ?? {}) },
      revision: remote.revision,
    };
  });

export const saveSettings = (settings: Settings, revision: string | null) =>
  Effect.gen(function* () {
    // Persist browser-only AI preferences before the server write so a storage
    // failure cannot commit a new revision that the caller never receives.
    yield* Effect.try({
      try: () =>
        globalThis.localStorage.setItem(storageKey, JSON.stringify(settings)),
      catch: () =>
        new SettingsStorageError({
          message:
            'Browser storage could not save your AI settings. Check available space and browser privacy settings.',
        }),
    });
    const saved = yield* requestSettings({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revision,
        school: { subjects: settings.subjects, timetable: settings.timetable },
      }),
    });
    // A failed server write leaves the local migration source intact. Once saved,
    // the server is authoritative even if removing the local copy fails.
    yield* Effect.try(() =>
      globalThis.localStorage.setItem(
        storageKey,
        JSON.stringify({ ai: settings.ai }),
      ),
    ).pipe(Effect.ignore);
    return saved;
  });
