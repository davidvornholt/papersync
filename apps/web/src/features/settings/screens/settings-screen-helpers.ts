import type { TimetableDay } from '@/shared/settings/schema';
export const getConfiguredDaysCount = (
  timetable: ReadonlyArray<TimetableDay>,
): number => timetable.filter((day) => day.subjectIds.length > 0).length;
