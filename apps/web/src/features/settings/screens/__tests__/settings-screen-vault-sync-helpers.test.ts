import { describe, expect, test } from 'bun:test';
import {
  defaultSettings,
  type Settings,
} from '@/shared/hooks/use-settings-schema';
import { hasVaultSyncChanges } from '../hooks/settings-screen-vault-sync-helpers';

describe('settings-screen-vault-sync-helpers', () => {
  test('returns false when only AI settings change', () => {
    const previousSettings = defaultSettings;
    const nextSettings: Settings = {
      ...defaultSettings,
      ai: { ...defaultSettings.ai, googleApiKey: 'new-key' },
    };

    expect(hasVaultSyncChanges(previousSettings, nextSettings)).toBe(false);
  });

  test('returns true when subjects change', () => {
    const previousSettings = defaultSettings;
    const nextSettings: Settings = {
      ...defaultSettings,
      subjects: [...defaultSettings.subjects, { id: '5', name: 'Biology' }],
    };

    expect(hasVaultSyncChanges(previousSettings, nextSettings)).toBe(true);
  });

  test('returns true when timetable changes', () => {
    const previousSettings = defaultSettings;
    const nextSettings: Settings = {
      ...defaultSettings,
      timetable: defaultSettings.timetable.map((day) =>
        day.day === 'monday'
          ? {
              ...day,
              slots: [{ id: 'slot-1', subjectId: '1' }],
            }
          : day,
      ),
    };

    expect(hasVaultSyncChanges(previousSettings, nextSettings)).toBe(true);
  });
});
