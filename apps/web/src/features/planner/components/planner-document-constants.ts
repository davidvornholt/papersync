import type { TimetableDay } from './planner-document-types';

export const colors = {
  black: '#000000',
  darkGray: '#444444',
  mediumGray: '#888888',
  lightGray: '#BBBBBB',
  veryLightGray: '#DDDDDD',
  white: '#FFFFFF',
} as const;

export const LAYOUT = {
  pagePadding: 16,
  headerHeight: 28,
  headerMargin: 6,
  contentHeight: 770,
  lineHeight: 14,
  dayHeaderHeight: 18,
  subjectLabelHeight: 12,
  dayPadding: 8,
  minLinesPerSubject: 2,
  maxLinesPerSubject: 4,
  notesWeight: 2,
} as const;

export const WEEKDAYS: ReadonlyArray<{
  readonly name: string;
  readonly shortName: string;
  readonly key: TimetableDay['day'];
}> = [
  { name: 'Monday', shortName: 'Mon', key: 'monday' },
  { name: 'Tuesday', shortName: 'Tue', key: 'tuesday' },
  { name: 'Wednesday', shortName: 'Wed', key: 'wednesday' },
  { name: 'Thursday', shortName: 'Thu', key: 'thursday' },
  { name: 'Friday', shortName: 'Fri', key: 'friday' },
];
