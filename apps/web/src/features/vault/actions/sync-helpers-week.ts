import type { ISODate, WeekId } from '@/shared/types';

export const getCurrentWeekId = (): WeekId => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}` as WeekId;
};

export const getWeekDateRange = (
  weekId: WeekId,
): { start: ISODate; end: ISODate } => {
  const [year, weekPart] = weekId.split('-W');
  const weekNumber = parseInt(weekPart, 10);

  const jan1 = new Date(parseInt(year, 10), 0, 1);
  const dayOffset = (jan1.getDay() + 6) % 7;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() - dayOffset + (dayOffset > 3 ? 7 : 0));

  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    start: weekStart.toISOString().split('T')[0] as ISODate,
    end: weekEnd.toISOString().split('T')[0] as ISODate,
  };
};

export const getDayDate = (dayName: string, weekId: WeekId): ISODate => {
  const dayMap: Record<string, number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  };

  const dayOffset = dayMap[dayName.toLowerCase()] ?? 0;
  const { start } = getWeekDateRange(weekId);
  const startDate = new Date(start);
  startDate.setDate(startDate.getDate() + dayOffset);
  return startDate.toISOString().split('T')[0] as ISODate;
};
