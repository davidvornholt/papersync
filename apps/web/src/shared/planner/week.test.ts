import { expect, it } from 'bun:test';
import type { ISODate, WeekId } from '@/shared/types/schemas';
import { getIsoDate, getWeekDateRange, getWeekId } from './week';

it.each([
  ['2021-01-01T12:00:00', '2020-W53'],
  ['2021-01-04T12:00:00', '2021-W01'],
  ['2024-12-30T12:00:00', '2025-W01'],
  ['2025-12-31T12:00:00', '2026-W01'],
  ['2026-01-01T12:00:00', '2026-W01'],
  ['2026-07-15T12:00:00', '2026-W29'],
  ['2026-09-09T12:00:00', '2026-W37'],
])('maps %s to ISO week %s', (date, week) => {
  expect(getWeekId(new Date(date))).toBe(week as WeekId);
});

it.each([
  ['2026-W01', '2025-12-29', '2026-01-04'],
  ['2026-W05', '2026-01-26', '2026-02-01'],
  ['2026-W10', '2026-03-02', '2026-03-08'],
  ['2026-W20', '2026-05-11', '2026-05-17'],
  ['2026-W27', '2026-06-29', '2026-07-05'],
])('spans %s from Monday %s to Sunday %s', (week, start, end) => {
  const range = getWeekDateRange(week as WeekId);
  expect(getIsoDate(range.start)).toBe(start as ISODate);
  expect(getIsoDate(range.end)).toBe(end as ISODate);
  expect(range.start.getDay()).toBe(1);
  expect(range.end.getDay()).toBe(0);
});
