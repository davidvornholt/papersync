import type { TimetableDay } from '@/shared/hooks/use-settings-schema';
export const getConfiguredDaysCount = (
  timetable: ReadonlyArray<TimetableDay>,
): number => timetable.filter((day) => day.slots.length > 0).length;
