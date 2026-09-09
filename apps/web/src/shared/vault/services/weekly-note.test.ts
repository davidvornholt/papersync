import { expect, it } from 'bun:test';
import type { ISODate, WeekId } from '@/shared/types/schemas';
import { convertEntriesToWeeklyNote } from '../actions/sync-helpers';
import { parseWeeklyNoteMarkdown } from './weekly-note-parse';
import { serializeWeeklyNoteToMarkdown } from './weekly-note-serialize';

const week = '2025-W01' as WeekId;
const entry = {
  id: 'entry-1',
  day: 'Monday',
  subject: 'Math',
  content: 'Do exercise 1',
  isTask: true,
  isCompleted: false,
  isNew: true,
  dueDate: '2025-01-03',
};

it('markdown round-trips dates across an ISO week-year boundary', () => {
  const note = convertEntriesToWeeklyNote(
    [entry, { ...entry, subject: 'General Tasks', content: 'Pack bag' }],
    week,
    null,
  );
  const parsed = parseWeeklyNoteMarkdown(
    serializeWeeklyNoteToMarkdown(note),
    week,
  );
  expect(parsed).toEqual(note);
  expect(parsed.days[0].date).toBe('2024-12-30' as ISODate);
});

it('rescans correct due dates and preserve completed homework', () => {
  const original = convertEntriesToWeeklyNote(
    [{ ...entry, isCompleted: true }],
    week,
    null,
  );
  const revised = convertEntriesToWeeklyNote(
    [{ ...entry, dueDate: '2025-01-04' }],
    week,
    original,
  );
  expect(revised.days[0].entries[0].tasks).toEqual([
    {
      content: entry.content,
      dueDate: '2025-01-04' as ISODate,
      isCompleted: true,
    },
  ]);
});
