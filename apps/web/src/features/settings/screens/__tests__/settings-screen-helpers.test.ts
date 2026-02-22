import { describe, expect, test } from 'bun:test';
import { defaultSettings } from '@/shared/hooks/use-settings-schema';
import {
  getConfiguredDaysCount,
  isVaultConfigured,
} from '../settings-screen-helpers';

describe('settings-screen-helpers', () => {
  test('isVaultConfigured returns true for local vault with path', () => {
    const settings = {
      ...defaultSettings,
      vault: {
        ...defaultSettings.vault,
        method: 'local' as const,
        localPath: '/Users/test/vault',
      },
    };

    expect(isVaultConfigured(settings)).toBe(true);
  });

  test('isVaultConfigured returns false when github repository is missing', () => {
    const settings = {
      ...defaultSettings,
      vault: {
        ...defaultSettings.vault,
        method: 'github' as const,
        githubConnected: true,
        githubRepo: '',
      },
    };

    expect(isVaultConfigured(settings)).toBe(false);
  });

  test('getConfiguredDaysCount counts only days that have slots', () => {
    const timetable = [
      { day: 'monday', slots: [{ id: 'slot-1', subjectId: '1' }] },
      { day: 'tuesday', slots: [] },
      { day: 'wednesday', slots: [{ id: 'slot-2', subjectId: '2' }] },
    ] as const;

    expect(getConfiguredDaysCount(timetable)).toBe(2);
  });

  test('getConfiguredDaysCount returns zero when timetable is empty', () => {
    expect(getConfiguredDaysCount([])).toBe(0);
  });
});
