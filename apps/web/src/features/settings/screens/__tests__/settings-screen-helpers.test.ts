import { describe, expect, it } from 'bun:test';
import { defaultSettings } from '@/shared/hooks/use-settings-schema';
import {
  getConfiguredDaysCount,
  isVaultConfigured,
} from '../settings-screen-helpers';

describe('settings-screen-helpers', () => {
  it('isVaultConfigured returns true for local vault with path', () => {
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

  it('isVaultConfigured returns false when github repository is missing', () => {
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

  it('the hosted Super Productivity queue needs no local endpoint', () => {
    expect(
      isVaultConfigured({
        ...defaultSettings,
        vault: { method: 'super-productivity' },
      }),
    ).toBe(true);
  });

  it('getConfiguredDaysCount counts only days that have slots', () => {
    const timetable = [
      { day: 'monday', slots: [{ id: 'slot-1', subjectId: '1' }] },
      { day: 'tuesday', slots: [] },
      { day: 'wednesday', slots: [{ id: 'slot-2', subjectId: '2' }] },
    ] as const;

    expect(getConfiguredDaysCount(timetable)).toBe(2);
  });

  it('getConfiguredDaysCount returns zero when timetable is empty', () => {
    expect(getConfiguredDaysCount([])).toBe(0);
  });
});
