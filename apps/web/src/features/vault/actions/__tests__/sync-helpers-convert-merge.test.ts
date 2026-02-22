import { describe, expect, it } from 'bun:test';
import type { ISODate, WeekId, WeeklyNote } from '@/shared/types';
import {
  convertEntriesToWeeklyNote,
  type ExtractedEntry,
} from '../sync-helpers';

describe('convertEntriesToWeeklyNote merge behavior', () => {
  it('should merge with existing note and deduplicate tasks', () => {
    const entries: ExtractedEntry[] = [
      {
        id: '1',
        day: 'Monday',
        subject: 'Math',
        content: 'Existing task',
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
        content: 'Existing general task',
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

    expect(result.generalTasks).toHaveLength(2);
    expect(result.generalTasks[0].content).toBe('Existing general task');
    expect(result.generalTasks[0].isCompleted).toBe(true);
    expect(result.generalTasks[1].content).toBe('New general task');
  });
});

describe('BUG: preserving days not in new entries', () => {
  it('should preserve Monday when new entries only contain Tuesday', () => {
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

    const mondayDay = result.days.find((d) => d.dayName === 'Monday');
    const tuesdayDay = result.days.find((d) => d.dayName === 'Tuesday');

    expect(result.days).toHaveLength(2);
    expect(mondayDay).toBeDefined();
    expect(tuesdayDay).toBeDefined();
    expect(mondayDay?.entries).toHaveLength(1);
    expect(mondayDay?.entries[0].subject).toBe('Math');
    expect(mondayDay?.entries[0].tasks[0].content).toBe(
      'Math homework page 42',
    );
    expect(tuesdayDay?.entries).toHaveLength(1);
    expect(tuesdayDay?.entries[0].subject).toBe('Physics');
  });
});
