import { describe, expect, it } from 'bun:test';
import { getConfiguredDaysCount } from '../settings-screen-helpers';

describe('settings-screen-helpers', () => {
  it('getConfiguredDaysCount counts only days that have subjects', () => {
    const timetable = [
      { day: 'monday', subjectIds: ['1'] },
      { day: 'tuesday', subjectIds: [] },
      { day: 'wednesday', subjectIds: ['2'] },
    ] as const;

    expect(getConfiguredDaysCount(timetable)).toBe(2);
  });

  it('getConfiguredDaysCount returns zero when timetable is empty', () => {
    expect(getConfiguredDaysCount([])).toBe(0);
  });
});
