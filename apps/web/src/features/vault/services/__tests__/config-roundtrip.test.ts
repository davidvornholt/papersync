import { describe, expect, it } from 'bun:test';
import type { ISODate, WeekId, WeeklyNote } from '@/shared/types';
import {
  parseWeeklyNoteMarkdown,
  serializeWeeklyNoteToMarkdown,
} from '../config';

describe('Weekly note markdown round-trip', () => {
  it('should round-trip serialize and parse without losing data', () => {
    const originalNote: WeeklyNote = {
      week: '2026-W05' as WeekId,
      dateRange: {
        start: '2026-01-26' as ISODate,
        end: '2026-02-01' as ISODate,
      },
      syncedAt: '2026-01-27T12:00:00Z' as WeeklyNote['syncedAt'],
      days: [
        {
          date: '2026-01-27' as ISODate,
          dayName: 'Monday',
          entries: [
            {
              subject: 'Math',
              tasks: [
                {
                  content: 'Do homework',
                  isCompleted: false,
                  dueDate: '2026-01-30' as ISODate,
                },
                { content: 'Complete exercises', isCompleted: true },
              ],
            },
            {
              subject: 'Physics',
              tasks: [{ content: 'Read chapter 5', isCompleted: false }],
            },
          ],
        },
      ],
      generalTasks: [
        { content: 'Buy supplies', isCompleted: false },
        { content: 'Call parent', isCompleted: true },
      ],
    };

    const markdown = serializeWeeklyNoteToMarkdown(originalNote);
    const parsedNote = parseWeeklyNoteMarkdown(markdown, '2026-W05' as WeekId);

    expect(parsedNote.week).toBe(originalNote.week);
    expect(parsedNote.dateRange.start).toBe(originalNote.dateRange.start);
    expect(parsedNote.dateRange.end).toBe(originalNote.dateRange.end);
    expect(parsedNote.syncedAt).toBe(originalNote.syncedAt);

    expect(parsedNote.days).toHaveLength(1);
    expect(parsedNote.days[0].dayName).toBe('Monday');
    expect(parsedNote.days[0].entries).toHaveLength(2);

    const mathEntry = parsedNote.days[0].entries.find(
      (e) => e.subject === 'Math',
    );
    expect(mathEntry?.tasks).toHaveLength(2);
    expect(mathEntry?.tasks[0].content).toBe('Do homework');
    expect(mathEntry?.tasks[0].isCompleted).toBe(false);
    expect(String(mathEntry?.tasks[0].dueDate)).toBe('2026-01-30');
    expect(mathEntry?.tasks[1].content).toBe('Complete exercises');
    expect(mathEntry?.tasks[1].isCompleted).toBe(true);

    expect(parsedNote.generalTasks).toHaveLength(2);
    expect(parsedNote.generalTasks[0].content).toBe('Buy supplies');
    expect(parsedNote.generalTasks[0].isCompleted).toBe(false);
    expect(parsedNote.generalTasks[1].content).toBe('Call parent');
    expect(parsedNote.generalTasks[1].isCompleted).toBe(true);
  });
});
