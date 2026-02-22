import { describe, expect, it } from 'bun:test';
import type { ISODate, WeekId, WeeklyNote } from '@/shared/types';
import { serializeWeeklyNoteToMarkdown } from '../config';

describe('serializeWeeklyNoteToMarkdown', () => {
  it('should include YAML frontmatter', () => {
    const note: WeeklyNote = {
      week: '2026-W05' as WeekId,
      dateRange: {
        start: '2026-01-26' as ISODate,
        end: '2026-02-01' as ISODate,
      },
      days: [],
      generalTasks: [],
    };

    const result = serializeWeeklyNoteToMarkdown(note);
    expect(result).toContain('---');
    expect(result).toContain('week: 2026-W05');
    expect(result).toContain('date_range: 2026-01-26 to 2026-02-01');
  });

  it('should include syncedAt when present', () => {
    const note: WeeklyNote = {
      week: '2026-W05' as WeekId,
      dateRange: {
        start: '2026-01-26' as ISODate,
        end: '2026-02-01' as ISODate,
      },
      syncedAt: '2026-01-27T12:00:00Z' as WeeklyNote['syncedAt'],
      days: [],
      generalTasks: [],
    };

    const result = serializeWeeklyNoteToMarkdown(note);
    expect(result).toContain('synced_at: 2026-01-27T12:00:00Z');
  });

  it('should serialize day entries with subjects', () => {
    const note: WeeklyNote = {
      week: '2026-W05' as WeekId,
      dateRange: {
        start: '2026-01-26' as ISODate,
        end: '2026-02-01' as ISODate,
      },
      days: [
        {
          date: '2026-01-26' as ISODate,
          dayName: 'Monday',
          entries: [
            {
              subject: 'Math',
              tasks: [
                { content: 'Homework', isCompleted: false },
                { content: 'Review', isCompleted: true },
              ],
            },
          ],
        },
      ],
      generalTasks: [],
    };

    const result = serializeWeeklyNoteToMarkdown(note);
    expect(result).toContain('## Monday');
    expect(result).toContain('### Math');
    expect(result).toContain('- [ ] Homework');
    expect(result).toContain('- [x] Review');
  });

  it('should serialize general tasks at the end', () => {
    const note: WeeklyNote = {
      week: '2026-W05' as WeekId,
      dateRange: {
        start: '2026-01-26' as ISODate,
        end: '2026-02-01' as ISODate,
      },
      days: [
        {
          date: '2026-01-26' as ISODate,
          dayName: 'Monday',
          entries: [],
        },
      ],
      generalTasks: [
        { content: 'General task 1', isCompleted: false },
        { content: 'General task 2', isCompleted: true },
      ],
    };

    const result = serializeWeeklyNoteToMarkdown(note);

    expect(result).toContain('## General Tasks');
    expect(result).toContain('- [ ] General task 1');
    expect(result).toContain('- [x] General task 2');

    const mondayIndex = result.indexOf('## Monday');
    const generalTasksIndex = result.indexOf('## General Tasks');
    expect(generalTasksIndex).toBeGreaterThan(mondayIndex);
  });
});
