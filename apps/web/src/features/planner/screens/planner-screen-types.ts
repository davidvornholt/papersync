import type { DayOfWeek, ISODate } from '@/shared/types';

export type ScheduleException = {
  id: string;
  date: ISODate;
  dayOfWeek: DayOfWeek;
  reason?: string;
  slots: Array<{ id: string; subjectId: string }>;
};

export const WEEKDAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export type PreviewPanelState =
  | 'configure'
  | 'generating'
  | 'generated'
  | 'error';
