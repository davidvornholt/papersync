import { describe, expect, it } from 'bun:test';
import { getConfiguredDaysCount } from '../settings-screen-helpers';

describe('settings-screen-helpers', () => {
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
