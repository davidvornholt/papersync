import type { TimetableDay } from '@/shared/hooks/use-settings-schema';
import type { DayOfWeek, ISODate, Subject } from '@/shared/types/schemas';
import type { PlannerState } from '../hooks/use-planner';
import type {
  PreviewPanelState,
  ScheduleException,
} from './planner-screen-types';
import { WEEKDAYS } from './planner-screen-types';
export const formatDateRange = (start: Date, end: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
  };

  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', {
    ...options,
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
};

export const getPreviewState = (
  plannerState: PlannerState,
): PreviewPanelState => {
  switch (plannerState.status) {
    case 'generating':
      return 'generating';
    case 'generated':
      return 'generated';
    case 'error':
      return 'error';
    default:
      return 'configure';
  }
};

export const getSubjectsForWeek = (
  timetable: ReadonlyArray<TimetableDay>,
  subjects: ReadonlyArray<Subject>,
  exceptions: ReadonlyArray<ScheduleException>,
): ReadonlyArray<Subject> => {
  const subjectIds = new Set<string>();

  for (const day of timetable) {
    for (const slot of day.slots) {
      subjectIds.add(slot.subjectId);
    }
  }

  for (const exception of exceptions) {
    for (const slot of exception.slots) {
      subjectIds.add(slot.subjectId);
    }
  }

  if (subjectIds.size === 0) {
    return subjects;
  }

  return subjects.filter((subject) => subjectIds.has(subject.id));
};

export const applyExceptionsToTimetable = (
  timetable: ReadonlyArray<TimetableDay>,
  weekStartDate: Date,
  exceptions: ReadonlyArray<ScheduleException>,
): ReadonlyArray<TimetableDay> =>
  timetable
    .filter((day) => WEEKDAYS.includes(day.day))
    .map((daySchedule) => {
      const dayIndex = WEEKDAYS.indexOf(daySchedule.day);
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + dayIndex);
      const isoDate = dayDate.toISOString().split('T')[0] as ISODate;

      const exception = exceptions.find((entry) => entry.date === isoDate);
      if (!exception) {
        return daySchedule;
      }

      return {
        ...daySchedule,
        slots: exception.slots,
      };
    });

export const getDefaultSlotsForDay = (
  timetable: ReadonlyArray<TimetableDay>,
  dayOfWeek: DayOfWeek,
): Array<{ id: string; subjectId: string }> => {
  const daySchedule = timetable.find((day) => day.day === dayOfWeek);
  return daySchedule?.slots.map((slot) => ({ ...slot })) ?? [];
};

export const getExceptionForDate = (
  exceptions: ReadonlyArray<ScheduleException>,
  date: Date,
): ScheduleException | null => {
  const isoDate = date.toISOString().split('T')[0] as ISODate;
  return exceptions.find((entry) => entry.date === isoDate) ?? null;
};

export const upsertException = (
  exceptions: ReadonlyArray<ScheduleException>,
  exceptionData: Omit<ScheduleException, 'id'>,
): Array<ScheduleException> => {
  const existing = exceptions.find(
    (entry) => entry.date === exceptionData.date,
  );
  if (!existing) {
    return [...exceptions, { ...exceptionData, id: `exc-${Date.now()}` }];
  }

  return exceptions.map((entry) =>
    entry.date === exceptionData.date
      ? { ...exceptionData, id: entry.id }
      : entry,
  );
};
