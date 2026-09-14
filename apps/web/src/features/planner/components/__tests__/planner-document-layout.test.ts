import { describe, expect, it } from 'bun:test';
import { getWeekStartDate } from '@/shared/planner/week';
import type { WeekId } from '@/shared/types/schemas';
import { LAYOUT } from '../planner-document-constants';
import {
  calculateSheetLayout,
  getDaysOfWeek,
} from '../planner-document-helpers';
import type { TimetableDay } from '../planner-document-types';

const frontPageDays = 3;
const lightDay = 1;
const typicalDay = 4;
const fullDay = 6;
const busyDay = 8;
const shortDay = 2;
const freeDay = 0;
const tolerance = 0.01;

const dayKeys: ReadonlyArray<TimetableDay['day']> = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];
const subjects = Array.from({ length: busyDay }, (_, index) => ({
  id: `subject-${index}`,
  name: index === 0 ? 'Politics and social sciences' : `Subject ${index}`,
}));
const days = getDaysOfWeek(getWeekStartDate('2026-W38' as WeekId));
const pages = [days.slice(0, frontPageDays), days.slice(frontPageDays)];

const everyDay = (count: number): ReadonlyArray<number> =>
  dayKeys.map(() => count);
const unevenWeek: ReadonlyArray<number> = [
  fullDay,
  shortDay,
  freeDay,
  busyDay,
  frontPageDays,
];

const layoutFor = (countsPerDay: ReadonlyArray<number>) =>
  calculateSheetLayout(
    pages,
    dayKeys.map((day, index) => ({
      day,
      subjectIds: subjects
        .slice(0, countsPerDay[index])
        .map((subject) => subject.id),
    })),
    subjects,
  );

describe('planner sheet layout', () => {
  it.each([
    [everyDay(lightDay)],
    [everyDay(typicalDay)],
    [everyDay(fullDay)],
    [everyDay(busyDay)],
    [unevenWeek],
  ])(
    'rules both sides at one pitch within the configured range and fits each side for %j subjects per day',
    (countsPerDay) => {
      const sheet = layoutFor(countsPerDay);
      expect(sheet.lineHeight).toBeGreaterThanOrEqual(LAYOUT.minLineHeight);
      expect(sheet.lineHeight).toBeLessThanOrEqual(LAYOUT.maxLineHeight);
      for (const page of sheet.pages) {
        const used = page.reduce((sum, day) => sum + day.height, 0);
        expect(used).toBeLessThanOrEqual(LAYOUT.contentHeight + tolerance);
        for (const day of page) {
          expect(day.linesPerSubject).toBeGreaterThanOrEqual(1);
          expect(day.linesPerSubject * sheet.lineHeight).toBeLessThanOrEqual(
            day.cellHeight + tolerance,
          );
        }
      }
    },
  );

  it('gives the emptier side more lines instead of taller lines', () => {
    const linesPerSide = (countsPerDay: ReadonlyArray<number>) =>
      layoutFor(countsPerDay).pages.map((page) => page[0]?.linesPerSubject);
    const [frontTypical, backTypical] = linesPerSide(everyDay(typicalDay));
    const [frontFull, backFull] = linesPerSide(everyDay(fullDay));
    expect(backTypical).toBe((frontTypical ?? 0) + 1);
    expect(backFull).toBe((frontFull ?? 0) + 1);
  });

  it('gives every cell on a side the same height and fills the side', () => {
    const sheet = layoutFor(unevenWeek);
    for (const page of sheet.pages) {
      const cellHeights = new Set(page.map((day) => day.cellHeight));
      expect(cellHeights.size).toBe(1);
      const used = page.reduce((sum, day) => sum + day.height, 0);
      expect(used).toBeCloseTo(LAYOUT.contentHeight);
    }
  });

  it('keeps one cell for a day without classes', () => {
    const sheet = layoutFor(unevenWeek);
    const wednesday = sheet.pages[0]?.at(-1);
    expect(wednesday?.subjects).toHaveLength(0);
    expect(wednesday?.height).toBeCloseTo(
      LAYOUT.dayHeaderHeight + LAYOUT.dayGap + (wednesday?.cellHeight ?? 0),
    );
  });
});
