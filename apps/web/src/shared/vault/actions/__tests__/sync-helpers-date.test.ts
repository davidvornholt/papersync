import { describe, expect, it } from 'bun:test';
import {
  getWeekId as getCurrentWeekId,
  getDayDate,
  getWeekIsoDateRange as getWeekDateRange,
} from '@/shared/planner/week';
import type { WeekId } from '@/shared/types/schemas';

const weekPattern = /^\d{4}-W\d{2}$/u;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

const lastDayOffset = 6;
const millisecondsPerDay = 86_400_000;

describe('Sync Helper Functions', () => {
  describe('getCurrentWeekId', () => {
    it('should return ISO week format YYYY-Www', () => {
      const result = getCurrentWeekId();
      expect(result).toMatch(weekPattern);
    });
  });

  describe('getWeekDateRange', () => {
    it('should return start and end ISO dates', () => {
      const result = getWeekDateRange('2026-W05' as WeekId);

      expect(result.start).toMatch(datePattern);
      expect(result.end).toMatch(datePattern);
    });

    it('should have start before end with correct gap', () => {
      const result = getWeekDateRange('2026-W10' as WeekId);
      const startDate = new Date(result.start);
      const endDate = new Date(result.end);

      expect(startDate.getTime()).toBeLessThan(endDate.getTime());
      expect(Number.isFinite(startDate.getTime())).toBe(true);
      expect(Number.isFinite(endDate.getTime())).toBe(true);
    });

    it('should have 6 days between start and end', () => {
      const result = getWeekDateRange('2026-W15' as WeekId);
      const startDate = new Date(result.start);
      const endDate = new Date(result.end);
      const diffDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / millisecondsPerDay,
      );

      expect(diffDays).toBe(lastDayOffset);
    });
  });

  describe('getDayDate', () => {
    it('should return Monday date for Monday', () => {
      const weekId = '2026-W05' as WeekId;
      const { start } = getWeekDateRange(weekId);
      const result = getDayDate('Monday', weekId);

      expect(result).toBe(start);
    });

    it('should return correct offset for each day', () => {
      const weekId = '2026-W05' as WeekId;
      const monday = getDayDate('Monday', weekId);
      const tuesday = getDayDate('Tuesday', weekId);
      const wednesday = getDayDate('Wednesday', weekId);

      const mondayDate = new Date(monday);
      const tuesdayDate = new Date(tuesday);
      const wednesdayDate = new Date(wednesday);

      expect(tuesdayDate.getTime() - mondayDate.getTime()).toBe(
        millisecondsPerDay,
      );
      expect(wednesdayDate.getTime() - tuesdayDate.getTime()).toBe(
        millisecondsPerDay,
      );
    });

    it('should default to Monday offset for unknown day names', () => {
      const weekId = '2026-W05' as WeekId;
      const { start } = getWeekDateRange(weekId);
      const result = getDayDate('InvalidDay', weekId);

      expect(result).toBe(start);
    });
  });
});
