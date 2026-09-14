import { getIsoDate } from '@/shared/planner/week';
import type { Subject } from '@/shared/types/schemas';
import { LAYOUT, WEEKDAYS } from './planner-document-constants';
import type {
  DayData,
  DayInfo,
  SheetLayout,
  TimetableDay,
} from './planner-document-types';

const fridayOffset = 4;
export const getDaysOfWeek = (startDate: Date): ReadonlyArray<DayInfo> =>
  WEEKDAYS.map((day, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      name: day.name,
      shortName: day.shortName,
      date,
      dayKey: day.key,
    };
  });

export const formatDate = (date: Date): string => getIsoDate(date);

export const formatCompactDateRange = (start: Date): string => {
  const friday = new Date(start);
  friday.setDate(start.getDate() + fridayOffset);
  return `${formatDate(start)} – ${formatDate(friday)}`;
};

export const getSubjectsForDay = (
  dayKey: TimetableDay['day'],
  timetable: ReadonlyArray<TimetableDay>,
  subjects: ReadonlyArray<Subject>,
): ReadonlyArray<Subject> => {
  const daySchedule = timetable.find((t) => t.day === dayKey);
  if (!daySchedule || daySchedule.slots.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const result: Array<Subject> = [];

  for (const slot of daySchedule.slots) {
    if (!seenIds.has(slot.subjectId)) {
      const subject = subjects.find(
        (candidate) => candidate.id === slot.subjectId,
      );
      if (subject) {
        seenIds.add(slot.subjectId);
        result.push(subject);
      }
    }
  }

  return result;
};

type PageDays = ReadonlyArray<{
  readonly day: DayInfo;
  readonly subjects: ReadonlyArray<Subject>;
}>;

const dayOverhead = LAYOUT.dayHeaderHeight + LAYOUT.dayGap;

// A day without classes keeps one cell so its heading is not orphaned.
const cellCount = (subjects: ReadonlyArray<Subject>): number =>
  Math.max(1, subjects.length);

type PageMetrics = {
  /** Space available per subject cell if the side were filled exactly. */
  readonly cellBudget: number;
  readonly cells: number;
};

const measurePage = (page: PageDays): PageMetrics => {
  const cells = page.reduce((sum, item) => sum + cellCount(item.subjects), 0);
  const writingHeight = LAYOUT.contentHeight - page.length * dayOverhead;
  return { cellBudget: writingHeight / cells, cells };
};

const linesFor = (cellBudget: number, lineHeight: number): number =>
  Math.max(1, Math.floor(cellBudget / lineHeight));

// Below this difference in unruled points, prefer the taller pitch.
const wasteTolerance = 0.5;

/**
 * Picks one ruling pitch for the whole sheet. Every pitch that fills some
 * side exactly is a candidate; the one leaving the least unruled space across
 * both sides wins. When even one minimum-pitch line per cell does not fit on
 * the most crowded side, the pitch shrinks to fit.
 */
const sheetLineHeight = (pages: ReadonlyArray<PageMetrics>): number => {
  const minBudget = Math.min(...pages.map((page) => page.cellBudget));
  if (minBudget < LAYOUT.minLineHeight) {
    return Math.max(1, minBudget);
  }

  const candidates = pages.flatMap(({ cellBudget }) => {
    const maxLines = Math.floor(cellBudget / LAYOUT.minLineHeight);
    return Array.from({ length: maxLines }, (_, index) =>
      Math.min(LAYOUT.maxLineHeight, cellBudget / (index + 1)),
    ).filter((lineHeight) => lineHeight <= minBudget);
  });
  const waste = (lineHeight: number): number =>
    pages.reduce(
      (sum, { cellBudget, cells }) =>
        sum +
        (cellBudget - linesFor(cellBudget, lineHeight) * lineHeight) * cells,
      0,
    );

  return candidates.reduce((best, candidate) => {
    const difference = waste(candidate) - waste(best);
    return difference < -wasteTolerance ||
      (Math.abs(difference) <= wasteTolerance && candidate > best)
      ? candidate
      : best;
  });
};

/**
 * Lays out both sides of the sheet with a single ruling pitch. Every subject
 * cell on a side has the same height and the same whole number of lines; the
 * less crowded side gets more lines per cell rather than taller lines. Lines
 * sit at the bottom of the cell, so any excess widens the first writing zone.
 */
export const calculateSheetLayout = (
  pages: ReadonlyArray<ReadonlyArray<DayInfo>>,
  timetable: ReadonlyArray<TimetableDay>,
  subjects: ReadonlyArray<Subject>,
): SheetLayout => {
  const pageDays: ReadonlyArray<PageDays> = pages.map((days) =>
    days.map((day) => ({
      day,
      subjects: getSubjectsForDay(day.dayKey, timetable, subjects),
    })),
  );
  const metrics = pageDays.map(measurePage);
  const lineHeight = sheetLineHeight(metrics);

  return {
    lineHeight,
    pages: pageDays.map((page, pageIndex) => {
      const { cellBudget: cellHeight } = metrics[pageIndex];
      const linesPerSubject = linesFor(cellHeight, lineHeight);
      return page.map(
        (item): DayData => ({
          day: item.day,
          subjects: item.subjects,
          height: dayOverhead + cellCount(item.subjects) * cellHeight,
          cellHeight,
          linesPerSubject,
        }),
      );
    }),
  };
};

export const generateLineKeys = (
  subjectId: string,
  count: number,
): Array<string> =>
  Array.from({ length: count }, (_, index) => `${subjectId}-l${index}`);
