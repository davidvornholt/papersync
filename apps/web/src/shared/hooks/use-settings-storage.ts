import { Effect } from 'effect';
import * as S from 'effect/Schema';
import {
  createDefaultTimetable,
  defaultSettings,
  type Settings,
  SettingsSchema,
} from './use-settings-schema';

const STORAGE_KEY = 'papersync-settings';

export const loadSettings = (): Effect.Effect<Settings, never> =>
  Effect.sync(() => {
    if (typeof window === 'undefined') return defaultSettings;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaultSettings;

      const parsed = JSON.parse(stored);
      if (!parsed.timetable) {
        parsed.timetable = createDefaultTimetable();
      }

      return S.decodeUnknownSync(SettingsSchema)(parsed);
    } catch {
      return defaultSettings;
    }
  });

export const saveSettings = (settings: Settings): Effect.Effect<void, never> =>
  Effect.sync(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      return;
    }
  });
