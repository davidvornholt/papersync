import { PgClient } from '@effect/sql-pg';
import { Homework } from '@papersync/homework/contract';
import { getHomeworkId } from '@papersync/homework/identity';
import { Effect, Schema } from 'effect';
import type { OCRResponse } from '@/shared/types/schemas';
import { HomeworkError } from './error';

export const reconcileHomework = (data: OCRResponse) =>
  Effect.gen(function* () {
    if (!data.weekId || data.entries.length === 0) {
      return data;
    }
    const sql = yield* PgClient.PgClient;
    // Include both queued and imported homework: either has already been reviewed.
    const rows =
      yield* sql`SELECT payload FROM homework WHERE payload->>'week' = ${data.weekId}`;
    const decoded = yield* Schema.decodeUnknown(
      Schema.Array(Schema.Struct({ payload: Homework })),
    )(rows);
    const saved = new Map(decoded.map(({ payload }) => [payload.id, payload]));
    const week = data.weekId;
    const entries = yield* Effect.forEach(data.entries, (entry) =>
      Effect.gen(function* () {
        const id = yield* getHomeworkId(
          week,
          entry.day,
          entry.subject,
          entry.content,
        );
        const previous = saved.get(id);
        if (!previous) {
          return entry;
        }
        const unchanged =
          previous.isCompleted === entry.isCompleted &&
          previous.dueDate === entry.dueDate;
        return {
          ...entry,
          // Identity already ignores whitespace; retain the reviewed wording.
          day: previous.day,
          subject: previous.subject,
          content: previous.content,
          action: unchanged ? ('skip' as const) : ('modify' as const),
        };
      }),
    );
    return { ...data, entries };
  }).pipe(
    Effect.mapError(
      (cause) =>
        new HomeworkError({
          message:
            'Could not compare this scan with saved homework. Retry analysis before saving.',
          cause,
        }),
    ),
  );
