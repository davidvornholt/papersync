import { PgClient } from '@effect/sql-pg';
import { Homework, PendingHomework } from '@papersync/homework/contract';
import { getHomeworkId, hashContent } from '@papersync/homework/identity';
import { Effect, Schema } from 'effect';
import {
  type ExtractedEntry,
  keepsReviewedDate,
} from '@/shared/homework/entry';
import { HomeworkError } from './error';

type QueueOptions = {
  readonly weekId: string;
};
type SavedDates = {
  readonly dueDate: string | null;
  // Null when the homework was not read from a scan.
  readonly read: { readonly dueDate: string | null } | null;
};
const toHomework = (
  entry: Omit<ExtractedEntry, 'action'>,
  options: QueueOptions,
  saved: ReadonlyMap<string, SavedDates>,
) =>
  Effect.gen(function* () {
    // A correction of saved homework keeps its ID, so the plugin updates the
    // task it imported instead of creating a second one.
    const id =
      entry.savedHomeworkIds?.find((link) => saved.has(link)) ??
      (yield* getHomeworkId(
        options.weekId,
        entry.day,
        entry.subject,
        entry.content,
      ));
    // Saving an entry reviewed for another reason, such as its wording, keeps
    // a date corrected after an earlier scan that read it the same way.
    const dates = saved.get(id);
    const dueDate =
      dates?.read && keepsReviewedDate(entry, dates.read.dueDate)
        ? dates.dueDate
        : entry.dueDate;
    const payload = yield* Schema.decodeUnknownEffect(Homework)({
      id,
      week: options.weekId,
      day: entry.day,
      subject: entry.subject,
      content: entry.content.trim(),
      ...(dueDate ? { dueDate } : {}),
    });
    return {
      payload,
      readingId: entry.readingId ?? null,
      // A draft stored before PaperSync recorded the date read has none, so
      // it compares with the saved date only, as before.
      readDueDate:
        entry.readDueDate === undefined
          ? (entry.dueDate ?? null)
          : entry.readDueDate,
    };
  });
const setHomework = ({
  payload,
  readingId,
  readDueDate,
}: {
  readonly payload: Homework;
  readonly readingId: string | null;
  readonly readDueDate: string | null;
}) =>
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;
    const revision = yield* hashContent(JSON.stringify(payload));
    // The first reading stays, so a rescan still recognizes it after later
    // corrections. The date read is the latest scan's, so a rescan reading it
    // again keeps the date reviewed after it; an entry not read from a scan
    // keeps the date read before.
    yield* sql`INSERT INTO homework (id, payload, revision, reading_id, read_due_date) VALUES (${payload.id}, ${sql.json(payload)}, ${revision}, ${readingId}, ${readDueDate})
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, revision = EXCLUDED.revision, reading_id = COALESCE(homework.reading_id, EXCLUDED.reading_id),
    read_due_date = CASE WHEN EXCLUDED.reading_id IS NULL THEN homework.read_due_date ELSE EXCLUDED.read_due_date END`;
  });
export const enqueueHomework = (
  entries: ReadonlyArray<ExtractedEntry>,
  options: QueueOptions,
) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Array(
        Schema.Struct({
          id: Schema.String,
          day: Schema.String,
          subject: Schema.String,
          content: Schema.String,
          dueDate: Schema.optional(Schema.String),
          savedHomeworkIds: Schema.optional(Schema.Array(Schema.String)),
          readingId: Schema.optional(Schema.String),
          readDueDate: Schema.optional(Schema.NullOr(Schema.String)),
        }),
      ),
    )(entries);
    if (decoded.length === 0) {
      return yield* Effect.fail(
        new HomeworkError({
          message: 'Select at least one entry to create a task.',
        }),
      );
    }
    const sql = yield* PgClient.PgClient;
    const stored = yield* sql<{
      id: string;
      dueDate: string | null;
      readingId: string | null;
      readDueDate: string | null;
    }>`SELECT id, payload->>'dueDate' AS "dueDate", reading_id AS "readingId", read_due_date AS "readDueDate" FROM homework WHERE payload->>'week' = ${options.weekId}`;
    const saved = new Map(
      stored.map((row): [string, SavedDates] => [
        row.id,
        {
          dueDate: row.dueDate,
          read: row.readingId === null ? null : { dueDate: row.readDueDate },
        },
      ]),
    );
    const rows = yield* Effect.forEach(decoded, (entry) =>
      toHomework(entry, options, saved),
    );
    yield* sql.withTransaction(
      Effect.forEach(rows, setHomework, { discard: true }),
    );
    return rows.length;
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
  return yield* Schema.decodeUnknownEffect(PendingHomework)(rows);
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

// A correction keeps the ID of its first wording, so its ID no longer matches it.
const isCorrection = (payload: Homework) =>
  getHomeworkId(
    payload.week,
    payload.day,
    payload.subject,
    payload.content,
  ).pipe(Effect.map((id) => id !== payload.id));
export const getImportableHomework = (canApplyCorrections: boolean) =>
  Effect.gen(function* () {
    const pending = yield* getPendingHomework;
    return canApplyCorrections
      ? pending
      : yield* Effect.filter(pending, (item) =>
          isCorrection(item.payload).pipe(
            Effect.map((corrected) => !corrected),
          ),
        );
  });
