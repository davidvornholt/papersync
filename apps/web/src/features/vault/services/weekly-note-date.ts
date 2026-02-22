import type { ISODate, WeekId } from '@/shared/types';

export const getDayDateFromWeekId = (
  dayName: string,
  weekId: WeekId,
): ISODate => {
  const dayMap: Record<string, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };

  const [yearStr, weekPart] = weekId.split('-W');
  const year = parseInt(yearStr, 10);
  const weekNumber = parseInt(weekPart, 10);

  const jan1 = new Date(year, 0, 1);
  const dayOffset = (jan1.getDay() + 6) % 7;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() - dayOffset + (dayOffset > 3 ? 7 : 0));

  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  const targetDate = new Date(weekStart);
  targetDate.setDate(weekStart.getDate() + (dayMap[dayName] ?? 0));

  return targetDate.toISOString().split('T')[0] as ISODate;
};

export const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};
