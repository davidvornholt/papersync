import { PgClient } from '@effect/sql-pg';
import { Homework } from '@papersync/homework/contract';
import { getHomeworkId } from '@papersync/homework/identity';
import { Effect, Schema } from 'effect';
import type { OCRResponse, TaskEntry } from '@/shared/types/schemas';
import { HomeworkError } from './error';

type SavedHomework = {
  readonly byId: ReadonlyMap<string, Homework>;
  readonly byWording: ReadonlyMap<string, Homework>;
};

const matchSaved = (
  entry: TaskEntry,
  id: string,
  saved: SavedHomework,
): TaskEntry => {
  const { savedHomeworkId, ...unlinked } = entry;
  const previous = saved.byId.get(id) ?? saved.byWording.get(id);
  if (previous) {
    return {
      ...unlinked,
      // Identity already ignores whitespace; retain the reviewed wording.
      day: previous.day,
      subject: previous.subject,
      content: previous.content,
      savedHomeworkId: previous.id,
      action: previous.dueDate === entry.dueDate ? 'skip' : 'modify',
    };
  }
  // A reviewed correction of saved homework in this week still corrects it.
  const corrected =
    savedHomeworkId === undefined ? undefined : saved.byId.get(savedHomeworkId);
  return corrected
    ? { ...unlinked, savedHomeworkId: corrected.id, action: 'modify' }
    : unlinked;
};

export const reconcileHomework = (data: OCRResponse) =>
  Effect.gen(function* () {
    if (!data.weekId || data.entries.length === 0) {
      return data;
    }
    const sql = yield* PgClient.PgClient;
    // Include both queued and imported homework: either has already been reviewed.
    const rows =
      yield* sql`SELECT payload FROM homework WHERE payload->>'week' = ${data.weekId}`;
    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Array(Schema.Struct({ payload: Homework })),
    )(rows);
    const week = data.weekId;
    const saved: SavedHomework = {
      byId: new Map(decoded.map(({ payload }) => [payload.id, payload])),
      // A corrected entry keeps the ID of the wording first saved, so a rescan
      // matches either that wording or the correction.
      byWording: new Map(
        yield* Effect.forEach(decoded, ({ payload }) =>
          getHomeworkId(
            week,
            payload.day,
            payload.subject,
            payload.content,
          ).pipe(Effect.map((id) => [id, payload] as const)),
        ),
      ),
    };
    const entries = yield* Effect.forEach(data.entries, (entry) =>
      getHomeworkId(week, entry.day, entry.subject, entry.content).pipe(
        Effect.map((id) => matchSaved(entry, id, saved)),
      ),
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
