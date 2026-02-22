import { describe, expect, it } from 'bun:test';
import type { WeekId } from '@/shared/types';
import {
  getCurrentWeekId,
  getDayDate,
  getWeekDateRange,
} from '../sync-helpers';

describe('Sync Helper Functions', () => {
  describe('getCurrentWeekId', () => {
    it('should return ISO week format YYYY-Www', () => {
      const result = getCurrentWeekId();
      expect(result).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  describe('getWeekDateRange', () => {
    it('should return start and end ISO dates', () => {
      const result = getWeekDateRange('2026-W05' as WeekId);

      expect(result.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should have start before end with correct gap', () => {
      const result = getWeekDateRange('2026-W10' as WeekId);
      const startDate = new Date(result.start);
      const endDate = new Date(result.end);

      expect(startDate.getTime()).toBeLessThan(endDate.getTime());
      expect(startDate.toString()).not.toBe('Invalid Date');
      expect(endDate.toString()).not.toBe('Invalid Date');
    });

    it('should have 6 days between start and end', () => {
      const result = getWeekDateRange('2026-W15' as WeekId);
      const startDate = new Date(result.start);
      const endDate = new Date(result.end);
      const diffDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(diffDays).toBe(6);
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
        24 * 60 * 60 * 1000,
      );
      expect(wednesdayDate.getTime() - tuesdayDate.getTime()).toBe(
        24 * 60 * 60 * 1000,
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
