import type { TimetableDay } from './planner-document-types';
export const colors = {
  black: '#000000',
  darkGray: '#444444',
  lightGray: '#BBBBBB',
  white: '#FFFFFF',
} as const;

const a4Height = 841.89;
const pagePadding = 20;
const headerHeight = 28;
const headerMargin = 8;
const footerHeight = 12;

export const LAYOUT = {
  pagePadding,
  headerHeight,
  headerMargin,
  footerHeight,
  // Reserve the entire header and footer before allocating handwriting space.
  contentHeight:
    a4Height - pagePadding * 2 - headerHeight - headerMargin - footerHeight - 1,
  lineHeight: 18,
  dayHeaderHeight: 24,
  dayPadding: 6,
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
