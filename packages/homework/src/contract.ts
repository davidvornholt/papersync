import { Schema } from 'effect';

const weekPattern = /^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/u;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
export const Week = Schema.String.pipe(Schema.pattern(weekPattern));
export const DueDate = Schema.String.pipe(
  Schema.pattern(datePattern),
  Schema.filter((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    );
  }),
);
export const Homework = Schema.Struct({
  id: Schema.NonEmptyTrimmedString,
  week: Week,
  day: Schema.NonEmptyTrimmedString,
  subject: Schema.String,
  content: Schema.NonEmptyTrimmedString,
  isCompleted: Schema.Boolean,
  dueDate: Schema.optional(DueDate),
  projectId: Schema.optional(Schema.NonEmptyTrimmedString),
  tagIds: Schema.optional(Schema.Array(Schema.NonEmptyTrimmedString)),
});
export type Homework = typeof Homework.Type;
export const QueuedHomework = Schema.Struct({
  payload: Homework,
  revision: Schema.NonEmptyTrimmedString,
});
export type QueuedHomework = typeof QueuedHomework.Type;
export const PendingHomework = Schema.Array(QueuedHomework);
export const Acknowledgement = Schema.Struct({
  id: Schema.NonEmptyTrimmedString,
  revision: Schema.NonEmptyTrimmedString,
  taskId: Schema.NonEmptyTrimmedString,
});
