import { describe, expect, it } from 'bun:test';
import {
  getWeekDateRange,
  getWeekEndDate,
  getWeekId,
  getWeekStartDate,
} from '@/shared/planner/week';
import type { WeekId } from '@/shared/types/schemas';

const weekPattern = /^\d{4}-W\d{2}$/u;

const year2025 = 2025;
const decemberMonthIndex = 11;
const dayOfMonth = 29;
const year2026 = 2026;
const juneMonthIndex = 5;
const lastDayOffset = 6;
const millisecondsPerDay = 86_400_000;

describe('Week Calculation Utilities', () => {
  describe('getWeekId', () => {
    it('should return ISO week format YYYY-Www', () => {
      const result = getWeekId(new Date('2026-01-27'));
      expect(result).toMatch(weekPattern);
    });

    it('should calculate correct week for start of year', () => {
      // Jan 1, 2026 is a Thursday, so it's week 1
      const result = getWeekId(new Date('2026-01-01'));
      expect(String(result)).toBe('2026-W01');
    });

    it('should calculate correct week for mid-year', () => {
      // July 15, 2026 is in week 29
      const result = getWeekId(new Date('2026-07-15'));
      expect(String(result)).toBe('2026-W29');
    });

    it('should handle year boundaries correctly', () => {
      // Dec 31, 2025 (Wednesday) is in week 1 of 2026 per ISO 8601
      const result = getWeekId(new Date('2025-12-31'));
      expect(String(result)).toBe('2026-W01');
    });

    it('should use current date when no argument provided', () => {
      const result = getWeekId();
      expect(result).toMatch(weekPattern);
    });
  });

  describe('getWeekStartDate', () => {
    it('should return a Monday', () => {
      const result = getWeekStartDate('2026-W05' as WeekId);
      expect(result.getDay()).toBe(1); // Monday
    });

    it('should return correct date for week 1', () => {
      const result = getWeekStartDate('2026-W01' as WeekId);
      // Week 1 of 2026 starts on Dec 29, 2025
      expect(result.getFullYear()).toBe(year2025);
      expect(result.getMonth()).toBe(decemberMonthIndex); // December
      expect(result.getDate()).toBe(dayOfMonth);
    });

    it('should return correct date for week 27', () => {
      const result = getWeekStartDate('2026-W27' as WeekId);
      // Week 27 of 2026 starts on June 29
      expect(result.getFullYear()).toBe(year2026);
      expect(result.getMonth()).toBe(juneMonthIndex); // June
      expect(result.getDate()).toBe(dayOfMonth);
    });
  });

  describe('getWeekEndDate', () => {
    it('should return a Sunday', () => {
      const result = getWeekEndDate('2026-W05' as WeekId);
      expect(result.getDay()).toBe(0); // Sunday
    });

    it('should be 6 days after start date', () => {
      const weekId = '2026-W10' as WeekId;
      const start = getWeekStartDate(weekId);
      const end = getWeekEndDate(weekId);

      const diffDays = Math.round(
        (end.getTime() - start.getTime()) / millisecondsPerDay,
      );
      expect(diffDays).toBe(lastDayOffset);
    });
  });

  describe('getWeekDateRange', () => {
    it('should return object with start and end dates', () => {
      const result = getWeekDateRange('2026-W15' as WeekId);

      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
    });

    it('should have start as Monday and end as Sunday', () => {
      const result = getWeekDateRange('2026-W20' as WeekId);

      expect(result.start.getDay()).toBe(1); // Monday
      expect(result.end.getDay()).toBe(0); // Sunday
    });
  });
});
