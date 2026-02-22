import { describe, expect, it } from 'vitest';
import type { ISODate, WeekId, WeeklyNote } from '@/app/shared/types';
import {
  convertEntriesToWeeklyNote,
  type ExtractedEntry,
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

      // Verify start comes before end
      expect(startDate.getTime()).toBeLessThan(endDate.getTime());

      // Verify they are valid dates
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

  describe('convertEntriesToWeeklyNote', () => {
    it('should create WeeklyNote with correct week ID', () => {
      const entries: ExtractedEntry[] = [
        {
          id: '1',
          day: 'Monday',
          subject: 'Math',
          content: 'Homework',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
      ];

      const result = convertEntriesToWeeklyNote(
        entries,
        '2026-W05' as WeekId,
        null,
      );

      expect(result.week).toBe('2026-W05');
    });

    it('should group entries by day', () => {
      const entries: ExtractedEntry[] = [
        {
          id: '1',
          day: 'Monday',
          subject: 'Math',
          content: 'Task 1',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
        {
          id: '2',
          day: 'Tuesday',
          subject: 'Physics',
          content: 'Task 2',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
      ];

      const result = convertEntriesToWeeklyNote(
        entries,
        '2026-W05' as WeekId,
        null,
      );

      expect(result.days).toHaveLength(2);
      expect(result.days[0].dayName).toBe('Monday');
      expect(result.days[1].dayName).toBe('Tuesday');
    });

    it('should group entries by subject within a day', () => {
      const entries: ExtractedEntry[] = [
        {
          id: '1',
          day: 'Monday',
          subject: 'Math',
          content: 'Task 1',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
        {
          id: '2',
          day: 'Monday',
          subject: 'Math',
          content: 'Task 2',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
        {
          id: '3',
          day: 'Monday',
          subject: 'Physics',
          content: 'Task 3',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
      ];

      const result = convertEntriesToWeeklyNote(
        entries,
        '2026-W05' as WeekId,
        null,
      );

      const mondayDay = result.days.find((d) => d.dayName === 'Monday');
      expect(mondayDay?.entries).toHaveLength(2);

      const mathEntry = mondayDay?.entries.find((e) => e.subject === 'Math');
      expect(mathEntry?.tasks).toHaveLength(2);
    });

    it('should handle general tasks at week level (no subject)', () => {
      const entries: ExtractedEntry[] = [
        {
          id: '1',
          day: 'Monday',
          subject: '',
          content: 'General task',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
      ];

      const result = convertEntriesToWeeklyNote(
        entries,
        '2026-W05' as WeekId,
        null,
      );

      // General tasks are now at week level, not day level
      expect(result.generalTasks).toHaveLength(1);
      expect(result.generalTasks[0].content).toBe('General task');
    });

    it("should handle general tasks with 'General Tasks' subject", () => {
      const entries: ExtractedEntry[] = [
        {
          id: '1',
          day: 'Tuesday',
          subject: 'General Tasks',
          content: 'Buy supplies',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
      ];

      const result = convertEntriesToWeeklyNote(
        entries,
        '2026-W05' as WeekId,
        null,
      );

      expect(result.generalTasks).toHaveLength(1);
      expect(result.generalTasks[0].content).toBe('Buy supplies');
    });

    it('should merge with existing note and deduplicate tasks', () => {
      const entries: ExtractedEntry[] = [
        {
          id: '1',
          day: 'Monday',
          subject: 'Math',
          content: 'Existing task', // Duplicate
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
        {
          id: '2',
          day: 'Monday',
          subject: 'Math',
          content: 'New task',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
      ];

      const existingNote: WeeklyNote = {
        week: '2026-W05' as WeekId,
        dateRange: {
          start: '2026-01-26' as ISODate,
          end: '2026-02-01' as ISODate,
        },
        syncedAt: '2026-01-27T10:00:00Z' as WeeklyNote['syncedAt'],
        days: [
          {
            date: '2026-01-26' as ISODate,
            dayName: 'Monday',
            entries: [
              {
                subject: 'Math',
                tasks: [{ content: 'Existing task', isCompleted: true }],
              },
            ],
          },
        ],
        generalTasks: [],
      };

      const result = convertEntriesToWeeklyNote(
        entries,
        '2026-W05' as WeekId,
        existingNote,
      );

      const mondayDay = result.days.find((d) => d.dayName === 'Monday');
      const mathEntry = mondayDay?.entries.find((e) => e.subject === 'Math');

      // Should have 2 tasks: existing + new (duplicate not added again)
      expect(mathEntry?.tasks).toHaveLength(2);
      expect(mathEntry?.tasks[0].content).toBe('Existing task');
      expect(mathEntry?.tasks[1].content).toBe('New task');
    });

    it('should merge week-level general tasks', () => {
      const entries: ExtractedEntry[] = [
        {
          id: '1',
          day: 'Monday',
          subject: '',
          content: 'Existing general task', // Duplicate
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
        {
          id: '2',
          day: 'Monday',
          subject: '',
          content: 'New general task',
          isTask: true,
          isCompleted: false,
          isNew: true,
        },
      ];

      const existingNote: WeeklyNote = {
        week: '2026-W05' as WeekId,
        dateRange: {
          start: '2026-01-26' as ISODate,
          end: '2026-02-01' as ISODate,
        },
        syncedAt: '2026-01-27T10:00:00Z' as WeeklyNote['syncedAt'],
        days: [],
        generalTasks: [{ content: 'Existing general task', isCompleted: true }],
      };

      const result = convertEntriesToWeeklyNote(
        entries,
        '2026-W05' as WeekId,
        existingNote,
      );

      // Should have 2 general tasks: existing + new (duplicate not added again)
      expect(result.generalTasks).toHaveLength(2);
      expect(result.generalTasks[0].content).toBe('Existing general task');
      expect(result.generalTasks[0].isCompleted).toBe(true); // Preserves existing state
      expect(result.generalTasks[1].content).toBe('New general task');
    });
  });
});

describe('BUG: preserving days not in new entries', () => {
  it('should preserve Monday when new entries only contain Tuesday', () => {
    // Scenario:
    // 1. First sync creates Monday homework
    // 2. Second sync has only Tuesday entries (AI filtered out Monday as duplicates)
    // 3. Monday should still be preserved

    const tuesdayOnlyEntries: ExtractedEntry[] = [
      {
        id: '1',
        day: 'Tuesday',
        subject: 'Physics',
        content: 'Do physics homework',
        isTask: true,
        isCompleted: false,
        isNew: true,
      },
    ];

    const existingNoteWithMonday: WeeklyNote = {
      week: '2026-W05' as WeekId,
      dateRange: {
        start: '2026-01-26' as ISODate,
        end: '2026-02-01' as ISODate,
      },
      syncedAt: '2026-01-27T10:00:00Z' as WeeklyNote['syncedAt'],
      days: [
        {
          date: '2026-01-26' as ISODate,
          dayName: 'Monday',
          entries: [
            {
              subject: 'Math',
              tasks: [{ content: 'Math homework page 42', isCompleted: false }],
            },
          ],
        },
      ],
      generalTasks: [],
    };

    const result = convertEntriesToWeeklyNote(
      tuesdayOnlyEntries,
      '2026-W05' as WeekId,
      existingNoteWithMonday,
    );

    // Both days should exist
    console.log('Result days:', JSON.stringify(result.days, null, 2));

    expect(result.days).toHaveLength(2);

    const mondayDay = result.days.find((d) => d.dayName === 'Monday');
    const tuesdayDay = result.days.find((d) => d.dayName === 'Tuesday');

    expect(mondayDay).toBeDefined();
    expect(tuesdayDay).toBeDefined();

    // Monday homework should be preserved
    expect(mondayDay?.entries).toHaveLength(1);
    expect(mondayDay?.entries[0].subject).toBe('Math');
    expect(mondayDay?.entries[0].tasks[0].content).toBe(
      'Math homework page 42',
    );

    // Tuesday homework should be added
    expect(tuesdayDay?.entries).toHaveLength(1);
    expect(tuesdayDay?.entries[0].subject).toBe('Physics');
  });
});
