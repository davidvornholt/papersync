import type { Subject } from '@/shared/types';
import { LAYOUT, WEEKDAYS } from './planner-document-constants';
import type { DayData, DayInfo, TimetableDay } from './planner-document-types';

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

export const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const formatCompactDateRange = (start: Date): string => {
  const friday = new Date(start);
  friday.setDate(start.getDate() + 4);
  return `${formatDate(start)} – ${formatDate(friday)}`;
};

export const getSubjectsForDay = (
  dayKey: TimetableDay['day'],
  timetable: readonly TimetableDay[],
  subjects: readonly Subject[],
): readonly Subject[] => {
  const daySchedule = timetable.find((t) => t.day === dayKey);
  if (!daySchedule || daySchedule.slots.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const result: Subject[] = [];

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

const calculateLinesPerSubject = (
  subjectCount: number,
  availableHeight: number,
): number => {
  if (subjectCount === 0) {
    return 0;
  }

  const contentHeight =
    availableHeight - LAYOUT.dayHeaderHeight - LAYOUT.dayPadding;
  const perSubjectOverhead = LAYOUT.subjectLabelHeight + 2;
  const heightPerSubject = contentHeight / subjectCount;
  const heightForLines = heightPerSubject - perSubjectOverhead;
  const lines = Math.floor(heightForLines / LAYOUT.lineHeight);

  return Math.min(
    LAYOUT.maxLinesPerSubject,
    Math.max(LAYOUT.minLinesPerSubject, lines),
  );
};

export const calculatePageData = (
  days: readonly DayInfo[],
  timetable: readonly TimetableDay[],
  subjects: readonly Subject[],
  availableHeight: number,
): DayData[] => {
  const daysWithSubjects = days.map((day) => ({
    day,
    subjects: getSubjectsForDay(day.dayKey, timetable, subjects),
  }));

  const weights = daysWithSubjects.map((item) =>
    Math.max(1, item.subjects.length),
  );
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  return daysWithSubjects.map((item, index) => {
    const weight = weights[index];
    const dayHeight = (weight / totalWeight) * availableHeight;

    return {
      day: item.day,
      subjects: item.subjects,
      weight,
      linesPerSubject: calculateLinesPerSubject(
        item.subjects.length,
        dayHeight,
      ),
    };
  });
};

export const generateLineKeys = (subjectId: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) => `${subjectId}-l${index}`);
