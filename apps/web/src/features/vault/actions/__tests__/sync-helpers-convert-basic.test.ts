import { describe, expect, it } from 'bun:test';
import type { WeekId } from '@/shared/types';
import {
  convertEntriesToWeeklyNote,
  type ExtractedEntry,
} from '../sync-helpers';

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
    expect(String(result.week)).toBe('2026-W05');
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
    const mathEntry = mondayDay?.entries.find((e) => e.subject === 'Math');

    expect(mondayDay?.entries).toHaveLength(2);
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
});
