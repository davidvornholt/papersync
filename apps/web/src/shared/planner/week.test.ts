import { expect, it } from 'bun:test';
import type { ISODate, WeekId } from '@/shared/types/schemas';
import { getDayDate, getWeekId, getWeekIsoDateRange } from './week';

it.each([
  ['2021-01-01T12:00:00', '2020-W53'],
  ['2021-01-04T12:00:00', '2021-W01'],
  ['2024-12-30T12:00:00', '2025-W01'],
  ['2026-09-09T12:00:00', '2026-W37'],
])('maps %s to ISO week %s', (date, week) => {
  expect(getWeekId(new Date(date))).toBe(week as WeekId);
});

it('keeps school dates on their calendar day across a year boundary', () => {
  const week = '2025-W01' as WeekId;
  expect(getWeekIsoDateRange(week)).toEqual({
    start: '2024-12-30' as ISODate,
    end: '2025-01-05' as ISODate,
  });
  expect(getDayDate('Monday', week)).toBe('2024-12-30' as ISODate);
  expect(getDayDate('friday', week)).toBe('2025-01-03' as ISODate);
});
