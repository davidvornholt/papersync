import type { ISODate, WeekId } from '@/shared/types/schemas';

const daysPerWeek = 7;
const sundayOffset = 6;
const thursdayNumber = 4;
const millisecondsPerDay = 86_400_000;
const datePadding = 2;
export const dayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const getIsoDate = (date: Date): ISODate =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(datePadding, '0')}-${String(date.getDate()).padStart(datePadding, '0')}` as ISODate;

export const getWeekId = (date: Date = new Date()): WeekId => {
  const thursday = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  thursday.setUTCDate(
    thursday.getUTCDate() +
      thursdayNumber -
      (thursday.getUTCDay() || daysPerWeek),
  );
  const year = thursday.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(
    ((thursday.getTime() - yearStart) / millisecondsPerDay + 1) / daysPerWeek,
  );
  return `${year}-W${String(week).padStart(datePadding, '0')}` as WeekId;
};

export const getWeekStartDate = (weekId: WeekId): Date => {
  const [year, week] = weekId.split('-W').map(Number);
  const januaryFourth = new Date(year, 0, thursdayNumber);
  januaryFourth.setDate(
    januaryFourth.getDate() -
      ((januaryFourth.getDay() + sundayOffset) % daysPerWeek) +
      (week - 1) * daysPerWeek,
  );
  return januaryFourth;
};

export const getWeekEndDate = (weekId: WeekId): Date => {
  const end = getWeekStartDate(weekId);
  end.setDate(end.getDate() + sundayOffset);
  return end;
};

export const getWeekDateRange = (weekId: WeekId) => ({
  start: getWeekStartDate(weekId),
  end: getWeekEndDate(weekId),
});

export const getWeekIsoDateRange = (weekId: WeekId) => ({
  start: getIsoDate(getWeekStartDate(weekId)),
  end: getIsoDate(getWeekEndDate(weekId)),
});

export const getDayDate = (dayName: string, weekId: WeekId): ISODate => {
  const dayOffset = dayNames.findIndex(
    (day) => day.toLowerCase() === dayName.toLowerCase(),
  );
  const date = getWeekStartDate(weekId);
  date.setDate(date.getDate() + Math.max(0, dayOffset));
  return getIsoDate(date);
};
