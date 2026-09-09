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

it('preserves legacy persisted dates when merging and round-tripping a rescan', () => {
  const legacyMarkdown = `---
week: 2027-W01
date_range: 2026-12-28 to 2027-01-03
---

## Monday, December 28

### Math
- [ ] Monday homework

## Friday, January 1

### Math
- [x] Friday homework
`;
  const legacyWeek = '2027-W01' as WeekId;
  const existing = parseWeeklyNoteMarkdown(legacyMarkdown, legacyWeek);

  expect(existing.dateRange).toEqual({
    start: '2026-12-28' as ISODate,
    end: '2027-01-03' as ISODate,
  });
  expect(existing.days.find((day) => day.dayName === 'Monday')?.date).toBe(
    '2026-12-28' as ISODate,
  );
  expect(existing.days.find((day) => day.dayName === 'Friday')?.date).toBe(
    '2027-01-01' as ISODate,
  );

  const merged = convertEntriesToWeeklyNote(
    [
      {
        id: 'rescan-1',
        day: 'Friday',
        subject: 'Math',
        content: 'Friday homework',
        isTask: true,
        isCompleted: false,
        isNew: true,
      },
    ],
    legacyWeek,
    existing,
  );
  expect(merged.dateRange).toEqual(existing.dateRange);
  expect(merged.days.find((day) => day.dayName === 'Friday')?.date).toBe(
    '2027-01-01' as ISODate,
  );

  const reparsed = parseWeeklyNoteMarkdown(
    serializeWeeklyNoteToMarkdown(merged),
    legacyWeek,
  );
  expect(reparsed.dateRange).toEqual(existing.dateRange);
  expect(reparsed.days.find((day) => day.dayName === 'Friday')?.date).toBe(
    '2027-01-01' as ISODate,
  );
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
