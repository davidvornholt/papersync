import { PgClient } from '@effect/sql-pg';
import { Homework } from '@papersync/homework/contract';
import { getHomeworkId, getReadingId } from '@papersync/homework/identity';
import { Effect, Schema } from 'effect';
import {
  ISODate,
  type OCRResponse,
  type TaskEntry,
} from '@/shared/types/schemas';
import { HomeworkError } from './error';

// The saved date can replace a misread one in a scan entry.
const SavedPayload = Schema.Struct({
  ...Homework.fields,
  dueDate: Schema.optional(ISODate),
});
type SavedRow = {
  readonly payload: typeof SavedPayload.Type;
  // A corrected entry keeps the ID of the wording first saved, so a rescan
  // matches either that wording or the correction.
  readonly wordingId: string;
  readonly readingId: string | null;
  // The due date the last reviewed scan read, null when it read none, and
  // undefined when the homework was not read from a scan.
  readonly readDueDate: string | null | undefined;
};
type SavedHomework = {
  readonly byId: ReadonlyMap<string, SavedRow>;
  readonly byWording: ReadonlyMap<string, SavedRow>;
  readonly byReading: ReadonlyMap<string, SavedRow>;
};
type ReadEntry = TaskEntry & { readonly readingId: string };

// A rescan that reads the date an earlier scan read keeps the date reviewed
// after that scan, so a corrected misreading is not queued again. A date the
// reviewer changed in this scan, or that reads differently, is a change.
const keepsSavedDate = (entry: ReadEntry, saved: SavedRow) =>
  saved.payload.dueDate === entry.dueDate ||
  (saved.readDueDate !== undefined &&
    entry.readDueDate !== undefined &&
    (entry.dueDate ?? null) === entry.readDueDate &&
    entry.readDueDate === saved.readDueDate);

const matchSaved = (
  entry: ReadEntry,
  id: string,
  saved: SavedHomework,
): ReadEntry => {
  // A reviewed entry stays linked to the saved homework it corrects. Links
  // into other weeks are kept, so returning to one still corrects it there.
  const links = entry.savedHomeworkIds ?? [];
  const linked = links
    .map((link) => saved.byId.get(link))
    .find((match) => match !== undefined);
  if (linked) {
    const unchanged =
      linked.wordingId === id && linked.payload.dueDate === entry.dueDate;
    return { ...entry, action: unchanged ? 'skip' : 'modify' };
  }
  const row =
    saved.byId.get(id) ??
    saved.byWording.get(id) ??
    saved.byReading.get(entry.readingId);
  if (!row) {
    return entry;
  }
  const previous = row.payload;
  const unchanged = keepsSavedDate(entry, row);
  return {
    ...entry,
    // Identity already ignores whitespace; retain the reviewed wording, and
    // the reviewed date when the scan read it as before.
    day: previous.day,
    subject: previous.subject,
    content: previous.content,
    dueDate: unchanged ? previous.dueDate : entry.dueDate,
    savedHomeworkIds: [...links, previous.id],
    action: unchanged ? 'skip' : 'modify',
  };
};

// A reviewed entry keeps its first reading when its week is applied again.
const withReadingIds = (entries: OCRResponse['entries']) =>
  Effect.forEach(entries, (entry) =>
    entry.readingId === undefined
      ? getReadingId(entry.day, entry.subject, entry.content).pipe(
          Effect.map(
            (readingId): ReadEntry => ({
              ...entry,
              readingId,
              readDueDate: entry.dueDate ?? null,
            }),
          ),
        )
      : Effect.succeed({ ...entry, readingId: entry.readingId }),
  );

export const reconcileHomework = (data: OCRResponse) =>
  Effect.gen(function* () {
    const read = yield* withReadingIds(data.entries);
    if (!data.weekId || read.length === 0) {
      return { ...data, entries: read };
    }
    const sql = yield* PgClient.PgClient;
    // Include both queued and imported homework: either has already been reviewed.
    const stored =
      yield* sql`SELECT payload, reading_id AS "readingId", read_due_date AS "readDueDate" FROM homework WHERE payload->>'week' = ${data.weekId}`;
    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Array(
        Schema.Struct({
          payload: SavedPayload,
          readingId: Schema.NullOr(Schema.String),
          readDueDate: Schema.NullOr(Schema.String),
        }),
      ),
    )(stored);
    const week = data.weekId;
    const rows = yield* Effect.forEach(
      decoded,
      ({ payload, readingId, readDueDate }) =>
        getHomeworkId(week, payload.day, payload.subject, payload.content).pipe(
          Effect.map(
            (wordingId): SavedRow => ({
              payload,
              wordingId,
              readingId,
              readDueDate: readingId === null ? undefined : readDueDate,
            }),
          ),
        ),
    );
    const saved: SavedHomework = {
      byId: new Map(rows.map((row) => [row.payload.id, row])),
      byWording: new Map(rows.map((row) => [row.wordingId, row])),
      byReading: new Map(
        rows.flatMap((row) =>
          row.readingId === null ? [] : [[row.readingId, row] as const],
        ),
      ),
    };
    const entries = yield* Effect.forEach(read, (entry) =>
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
