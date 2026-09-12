import { PgClient } from '@effect/sql-pg';
import { Homework, PendingHomework } from '@papersync/homework/contract';
import { getHomeworkId, hashContent } from '@papersync/homework/identity';
import { Effect, Schema } from 'effect';
import type { ExtractedEntry } from '@/shared/homework/entry';
import { HomeworkError } from './error';

type QueueOptions = {
  readonly weekId: string;
};
const toHomework = (entry: ExtractedEntry, options: QueueOptions) =>
  Effect.gen(function* () {
    const id = yield* getHomeworkId(
      options.weekId,
      entry.day,
      entry.subject,
      entry.content,
    );
    return yield* Schema.decodeUnknown(Homework)({
      id,
      week: options.weekId,
      day: entry.day,
      subject: entry.subject,
      content: entry.content.trim(),
      isCompleted: entry.isCompleted,
      ...(entry.dueDate ? { dueDate: entry.dueDate } : {}),
    });
  });
const setHomework = (payload: Homework) =>
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;
    const revision = yield* hashContent(JSON.stringify(payload));
    yield* sql`INSERT INTO homework (id, payload, revision) VALUES (${payload.id}, ${sql.json(payload)}, ${revision})
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, revision = EXCLUDED.revision`;
  });
export const enqueueHomework = (
  entries: ReadonlyArray<ExtractedEntry>,
  options: QueueOptions,
) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(
      Schema.Array(
        Schema.Struct({
          id: Schema.String,
          day: Schema.String,
          subject: Schema.String,
          content: Schema.String,
          isTask: Schema.Boolean,
          isCompleted: Schema.Boolean,
          isNew: Schema.Boolean,
          dueDate: Schema.optional(Schema.String),
        }),
      ),
    )(entries);
    const tasks = decoded.filter((entry) => entry.isTask);
    if (tasks.length === 0) {
      return yield* Effect.fail(
        new HomeworkError({
          message: 'Select at least one entry to create a task.',
        }),
      );
    }
    const payloads = yield* Effect.forEach(tasks, (entry) =>
      toHomework(entry, options),
    );
    const sql = yield* PgClient.PgClient;
    yield* sql.withTransaction(
      Effect.forEach(payloads, setHomework, { discard: true }),
    );
    return payloads.length;
  }).pipe(
    Effect.mapError(
      (cause) =>
        new HomeworkError({
          message:
            'Could not save homework to the import queue. Check the entries and try again.',
          cause,
        }),
    ),
  );

export const getPendingHomework = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  const rows =
    yield* sql`SELECT payload, revision FROM homework WHERE imported_revision IS DISTINCT FROM revision ORDER BY created_at, id`;
  return yield* Schema.decodeUnknown(PendingHomework)(rows);
});
export const acknowledgeHomework = (
  id: string,
  revision: string,
  taskId: string,
) =>
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;
    yield* sql`UPDATE homework SET imported_revision = ${revision}, imported_task_id = ${taskId} WHERE id = ${id} AND revision = ${revision}`;
  });
