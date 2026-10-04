import { Schema } from 'effect';

const weekPattern = /^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/u;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const NonEmptyTrimmedString = Schema.Trimmed.check(Schema.isNonEmpty());
export const Week = Schema.String.check(Schema.isPattern(weekPattern));
export const DueDate = Schema.String.check(
  Schema.isPattern(datePattern),
  Schema.makeFilter((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    );
  }),
);
export const Homework = Schema.Struct({
  id: NonEmptyTrimmedString,
  week: Week,
  day: NonEmptyTrimmedString,
  subject: Schema.String,
  content: NonEmptyTrimmedString,
  dueDate: Schema.optional(DueDate),
});
export type Homework = typeof Homework.Type;
export const QueuedHomework = Schema.Struct({
  payload: Homework,
  revision: NonEmptyTrimmedString,
});
export type QueuedHomework = typeof QueuedHomework.Type;
export const PendingHomework = Schema.Array(QueuedHomework);
export const Acknowledgement = Schema.Struct({
  id: NonEmptyTrimmedString,
  revision: NonEmptyTrimmedString,
  taskId: NonEmptyTrimmedString,
});
