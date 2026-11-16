import { PgClient } from '@effect/sql-pg';
import { Homework } from '@papersync/homework/contract';
import { getHomeworkId } from '@papersync/homework/identity';
import { Effect, Schema } from 'effect';
import type { OCRResponse, TaskEntry } from '@/shared/types/schemas';
import { HomeworkError } from './error';

type SavedRow = {
  readonly payload: Homework;
  // A corrected entry keeps the ID of the wording first saved, so a rescan
  // matches either that wording or the correction.
  readonly wordingId: string;
};
type SavedHomework = {
  readonly byId: ReadonlyMap<string, SavedRow>;
  readonly byWording: ReadonlyMap<string, Homework>;
};

const matchSaved = (
  entry: TaskEntry,
  id: string,
  saved: SavedHomework,
): TaskEntry => {
  // A reviewed entry stays linked to the saved homework it corrects. Links
  // into other weeks are kept, so returning to one still corrects it there.
  const links = entry.savedHomeworkIds ?? [];
  const linked = links
    .map((link) => saved.byId.get(link))
    .find((row) => row !== undefined);
  if (linked) {
    const unchanged =
      linked.wordingId === id && linked.payload.dueDate === entry.dueDate;
    return { ...entry, action: unchanged ? 'skip' : 'modify' };
  }
  const previous = saved.byId.get(id)?.payload ?? saved.byWording.get(id);
  if (!previous) {
    return entry;
  }
  return {
    ...entry,
    // Identity already ignores whitespace; retain the reviewed wording.
    day: previous.day,
    subject: previous.subject,
    content: previous.content,
    savedHomeworkIds: [...links, previous.id],
    action: previous.dueDate === entry.dueDate ? 'skip' : 'modify',
  };
};

export const reconcileHomework = (data: OCRResponse) =>
  Effect.gen(function* () {
    if (!data.weekId || data.entries.length === 0) {
      return data;
    }
    const sql = yield* PgClient.PgClient;
    // Include both queued and imported homework: either has already been reviewed.
    const stored =
      yield* sql`SELECT payload FROM homework WHERE payload->>'week' = ${data.weekId}`;
    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Array(Schema.Struct({ payload: Homework })),
    )(stored);
    const week = data.weekId;
    const rows = yield* Effect.forEach(decoded, ({ payload }) =>
      getHomeworkId(week, payload.day, payload.subject, payload.content).pipe(
        Effect.map((wordingId): SavedRow => ({ payload, wordingId })),
      ),
    );
    const saved: SavedHomework = {
      byId: new Map(rows.map((row) => [row.payload.id, row])),
      byWording: new Map(rows.map((row) => [row.wordingId, row.payload])),
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
