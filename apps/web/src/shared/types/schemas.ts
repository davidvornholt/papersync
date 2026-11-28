import { DueDate, Week } from '@papersync/homework/contract';
import { Schema } from 'effect';

export const WeekId = Week.pipe(Schema.brand('WeekId'));
export type WeekId = typeof WeekId.Type;

export const ISODate = DueDate.pipe(Schema.brand('ISODate'));
export type ISODate = typeof ISODate.Type;

export const NonEmptyTrimmedString = Schema.Trimmed.check(Schema.isNonEmpty());

export const Subject = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  color: Schema.optional(Schema.String),
});
export type Subject = typeof Subject.Type;

export const DayOfWeek = Schema.Literals([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);
export type DayOfWeek = typeof DayOfWeek.Type;

export const TaskAction = Schema.Literals([
  'add',
  'modify',
  'complete',
  'skip',
]);
export type TaskAction = typeof TaskAction.Type;

export const TaskEntry = Schema.Struct({
  day: Schema.String,
  subject: Schema.String,
  content: Schema.String,
  action: TaskAction,
  dueDate: Schema.optional(ISODate),
  // The saved homework this entry matches, at most one per week, so a
  // correction updates its task in whichever week it is saved.
  savedHomeworkIds: Schema.optional(Schema.Array(Schema.String)),
  // The line as the scan first read it (see `getReadingId`), kept through
  // review, so a rescan that reads it the same way again recognizes the
  // homework saved from it even when it was corrected before saving.
  readingId: Schema.optional(Schema.String),
  // The due date as the scan read it, null when it read none, so a rescan
  // that reads the same date again keeps a corrected date.
  readDueDate: Schema.optional(Schema.NullOr(ISODate)),
  // On an already-saved entry, the due date of the saved homework it matches,
  // null when that has none. `dueDate` can differ: it stays as the scan read
  // it, so applying another week starts from the paper.
  savedDueDate: Schema.optional(Schema.NullOr(ISODate)),
  // The reviewer opened or set this date in the editor, so it counts as shown,
  // even when it equals the date read.
  isDueDateChosen: Schema.optional(Schema.Boolean),
});
export type TaskEntry = typeof TaskEntry.Type;

export const OCRResponse = Schema.Struct({
  weekId: Schema.NullOr(WeekId),
  entries: Schema.Array(TaskEntry),
  confidence: Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(1),
  ),
  notes: Schema.optional(Schema.String),
});
export type OCRResponse = typeof OCRResponse.Type;
