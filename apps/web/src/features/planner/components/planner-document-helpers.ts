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

// A day without classes keeps one block of space so its heading is not orphaned.
const dayWeight = (subjects: ReadonlyArray<Subject>): number =>
  Math.max(1, subjects.length);

const subjectHeightForPage = (page: PageDays): number => {
  const totalWeight = page.reduce(
    (sum, item) => sum + dayWeight(item.subjects),
    0,
  );
  const writingHeight = LAYOUT.contentHeight - page.length * dayOverhead;
  return writingHeight / totalWeight;
};

const linesFor = (subjectHeight: number, lineHeight: number): number =>
  Math.max(1, Math.floor((subjectHeight - LAYOUT.subjectGap) / lineHeight));

type PageMetrics = {
  readonly subjectHeight: number;
  readonly subjectCount: number;
};

// Below this difference in unruled points, prefer the taller pitch.
const wasteTolerance = 0.5;

/**
 * Picks one ruling pitch for the whole sheet. Every pitch that fills some
 * side exactly is a candidate; the one leaving the least unruled space across
 * both sides wins. When even one 8 mm line per subject does not fit on the
 * most crowded side, the gap between subjects goes first and the pitch last.
 */
const sheetLineHeight = (pages: ReadonlyArray<PageMetrics>): number => {
  const minSubjectHeight = Math.min(...pages.map((p) => p.subjectHeight));
  const minWritable = minSubjectHeight - LAYOUT.subjectGap;
  if (minWritable < LAYOUT.minLineHeight) {
    return Math.max(1, Math.min(LAYOUT.minLineHeight, minSubjectHeight));
  }

  const candidates = pages.flatMap(({ subjectHeight }) => {
    const writable = subjectHeight - LAYOUT.subjectGap;
    const maxLines = Math.floor(writable / LAYOUT.minLineHeight);
    return Array.from({ length: maxLines }, (_, index) =>
      Math.min(LAYOUT.maxLineHeight, writable / (index + 1)),
    ).filter((lineHeight) => lineHeight <= minWritable);
  });
  const waste = (lineHeight: number): number =>
    pages.reduce(
      (sum, { subjectHeight, subjectCount }) =>
        sum +
        (subjectHeight - linesFor(subjectHeight, lineHeight) * lineHeight) *
          subjectCount,
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
 * Lays out both sides of the sheet with a single ruling pitch. The less
 * crowded side gets more lines per subject rather than taller lines, and any
 * remainder becomes space after each block.
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
  const metrics: ReadonlyArray<PageMetrics> = pageDays.map((page) => ({
    subjectHeight: subjectHeightForPage(page),
    subjectCount: page.reduce((sum, item) => sum + item.subjects.length, 0),
  }));
  const lineHeight = sheetLineHeight(metrics);

  return {
    lineHeight,
    pages: pageDays.map((page, pageIndex) => {
      const { subjectHeight } = metrics[pageIndex];
      const linesPerSubject = linesFor(subjectHeight, lineHeight);
      return page.map(
        (item): DayData => ({
          day: item.day,
          subjects: item.subjects,
          height: dayOverhead + dayWeight(item.subjects) * subjectHeight,
          subjectHeight,
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
