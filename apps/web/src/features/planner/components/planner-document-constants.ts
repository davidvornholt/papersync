import type { TimetableDay } from './planner-document-types';

// Print stays monochrome; names mirror the shared theme's paper-and-ink roles.
export const colors = {
  ink: '#000000',
  graphite: '#444444',
  hairlineStrong: '#8A8A8A',
  hairline: '#C8C8C8',
  paper: '#FFFFFF',
} as const;

export const fonts = {
  display: 'Fraunces',
  body: 'DM Sans',
  mono: 'JetBrains Mono',
} as const;

const fontsourceVersion = '5.3.0';
const fontsourceFile = (pkg: string, file: string): string =>
  `https://cdn.jsdelivr.net/npm/@fontsource/${pkg}@${fontsourceVersion}/files/${file}`;

export const FONT_SOURCES: ReadonlyArray<{
  readonly family: string;
  readonly src: string;
  readonly fontWeight: number;
  readonly fontStyle?: 'italic';
}> = [
  {
    family: fonts.display,
    src: fontsourceFile('fraunces', 'fraunces-latin-400-normal.woff'),
    fontWeight: 400,
  },
  {
    family: fonts.display,
    src: fontsourceFile('fraunces', 'fraunces-latin-400-italic.woff'),
    fontWeight: 400,
    fontStyle: 'italic',
  },
  {
    family: fonts.display,
    src: fontsourceFile('fraunces', 'fraunces-latin-600-normal.woff'),
    fontWeight: 600,
  },
  {
    family: fonts.body,
    src: fontsourceFile('dm-sans', 'dm-sans-latin-500-normal.woff'),
    fontWeight: 500,
  },
  {
    family: fonts.mono,
    src: fontsourceFile(
      'jetbrains-mono',
      'jetbrains-mono-latin-400-normal.woff',
    ),
    fontWeight: 400,
  },
];

const pointsPerInch = 72;
const millimetresPerInch = 25.4;
const pointsPerMillimetre = pointsPerInch / millimetresPerInch;
// Ruling pitch: narrow-ruled paper for small handwriting; cells fill the page regardless.
const minLinePitchMillimetres = 6;
const maxLinePitchMillimetres = 8;
const a4Height = 841.89;
const pagePadding = 24;
const headerHeight = 40;
const headerMargin = 10;
const footerHeight = 16;

export const LAYOUT = {
  pagePadding,
  headerHeight,
  headerMargin,
  footerHeight,
  // Reserve the header and footer before allocating handwriting space; the
  // final point absorbs rounding so fixed-height rows never spill onto a third page.
  contentHeight:
    a4Height - pagePadding * 2 - headerHeight - headerMargin - footerHeight - 1,
  dayHeaderHeight: 24,
  dayGap: 12,
  labelWidth: 100,
  labelGap: 10,
  minLineHeight: minLinePitchMillimetres * pointsPerMillimetre,
  maxLineHeight: maxLinePitchMillimetres * pointsPerMillimetre,
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
