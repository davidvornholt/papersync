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
