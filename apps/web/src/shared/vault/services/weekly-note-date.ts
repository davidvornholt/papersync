import { Schema } from 'effect';
import {
  dayNames,
  getDayDate,
  getWeekIsoDateRange,
} from '@/shared/planner/week';
import { ISODate } from '@/shared/types/schemas';
import type { WeekId } from '@/shared/types/schemas';

type ISODateRange = Readonly<{
  start: ISODate;
  end: ISODate;
}>;

const dateRangePattern =
  /^date_range:\s*(?<start>\d{4}-\d{2}-\d{2})\s+to\s+(?<end>\d{4}-\d{2}-\d{2})\r?$/mu;
const dateHeadingPattern =
  /^(?<month>[A-Za-z]+)\s+(?<day>\d{1,2})(?:,\s*(?<year>\d{4}))?$/u;
const monthNames = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export const isValidISODate = (value: unknown): value is ISODate =>
  Schema.is(ISODate)(value);

export const isValidDateRange = (value: unknown): value is ISODateRange => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isValidISODate(record.start) &&
    isValidISODate(record.end) &&
    record.start <= record.end
  );
};

export const parseDateRange = (
  metadata: string,
  weekId: WeekId,
): ISODateRange => {
  const groups = dateRangePattern.exec(metadata)?.groups;
  const candidate = { start: groups?.start, end: groups?.end };
  return isValidDateRange(candidate) ? candidate : getWeekIsoDateRange(weekId);
};

const getDateFromRange = (
  dayName: string,
  dateRange: ISODateRange,
  weekId: WeekId,
): ISODate => {
  const dayOffset = dayNames.findIndex(
    (day) => day.toLowerCase() === dayName.toLowerCase(),
  );
  if (dayOffset < 0) {
    return getDayDate(dayName, weekId);
  }
  const date = new Date(`${dateRange.start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10) as ISODate;
};

export const getDayDateFromHeading = (
  dayName: string,
  dateText: string | undefined,
  dateRange: ISODateRange,
  weekId: WeekId,
): ISODate => {
  const fallback = getDateFromRange(dayName, dateRange, weekId);
  const heading = dateText?.trim();
  if (!heading) {
    return fallback;
  }
  if (
    isValidISODate(heading) &&
    heading >= dateRange.start &&
    heading <= dateRange.end
  ) {
    return heading;
  }

  const groups = dateHeadingPattern.exec(heading)?.groups;
  if (!groups) {
    return fallback;
  }
  const month = monthNames.indexOf(groups.month.toLowerCase());
  const day = Number(groups.day);
  if (month < 0 || !Number.isInteger(day)) {
    return fallback;
  }

  const years = groups.year
    ? [Number(groups.year)]
    : [
        Number(dateRange.start.slice(0, 4)),
        Number(dateRange.end.slice(0, 4)),
        Number(weekId.slice(0, 4)),
      ];
  for (const year of [...new Set(years)]) {
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month) {
      continue;
    }
    const isoDate = date.toISOString().slice(0, 10) as ISODate;
    if (isoDate >= dateRange.start && isoDate <= dateRange.end) {
      return isoDate;
    }
  }
  return fallback;
};

export const formatDate = (isoDate: string): string =>
  new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
