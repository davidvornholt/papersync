import { getIsoDate } from '@/shared/planner/week';
import type { Subject } from '@/shared/types/schemas';
import { LAYOUT, WEEKDAYS } from './planner-document-constants';
import type { DayData, DayInfo, TimetableDay } from './planner-document-types';

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

export const calculatePageData = (
  days: ReadonlyArray<DayInfo>,
  timetable: ReadonlyArray<TimetableDay>,
  subjects: ReadonlyArray<Subject>,
  availableHeight: number,
): Array<DayData> => {
  const daysWithSubjects = days.map((day) => ({
    day,
    subjects: getSubjectsForDay(day.dayKey, timetable, subjects),
  }));

  const weights = daysWithSubjects.map((item) =>
    Math.max(1, item.subjects.length),
  );
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  const dayOverhead = LAYOUT.dayHeaderHeight + LAYOUT.dayPadding;
  const writingHeight = availableHeight - days.length * dayOverhead;

  return daysWithSubjects.map((item, index) => {
    const weight = weights[index];
    const dayHeight = dayOverhead + (weight / totalWeight) * writingHeight;

    const subjectHeight =
      item.subjects.length > 0
        ? (dayHeight - LAYOUT.dayHeaderHeight - LAYOUT.dayPadding) /
          item.subjects.length
        : 0;

    return {
      day: item.day,
      subjects: item.subjects,
      height: dayHeight,
      subjectHeight,
      linesPerSubject: Math.max(
        1,
        Math.floor(subjectHeight / LAYOUT.lineHeight),
      ),
    };
  });
};

export const generateLineKeys = (
  subjectId: string,
  count: number,
): Array<string> =>
  Array.from({ length: count }, (_, index) => `${subjectId}-l${index}`);
