import { PgClient } from '@effect/sql-pg';
import { Data, Effect, Schema } from 'effect';
import { SaveSchoolSettingsSchema, SchoolSettingsSchema } from './schema';

export class SchoolSettingsError extends Data.TaggedError(
  'SchoolSettingsError',
)<{
  readonly message: string;
  readonly status: number;
}> {}

const unavailable = () =>
  new SchoolSettingsError({
    message:
      'Could not access your timetable. Check your connection and retry.',
    status: 503,
  });

export const loadSchoolSettings = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  const rows = yield* sql<{
    payload: unknown;
    revision: string;
  }>`SELECT payload, revision FROM school_settings WHERE id = 'school'`.pipe(
    Effect.mapError(unavailable),
  );
  const [row] = rows;
  if (!row) {
    return { revision: null, school: null };
  }
  const school = yield* Schema.decodeUnknown(SchoolSettingsSchema)(
    row.payload,
  ).pipe(Effect.mapError(unavailable));
  return { revision: row.revision, school };
});

export const saveSchoolSettings = (input: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(SaveSchoolSettingsSchema)(
      input,
      { onExcessProperty: 'error' },
    ).pipe(
      Effect.mapError(
        () =>
          new SchoolSettingsError({
            message:
              'The timetable is invalid. Check the subjects and classes.',
            status: 400,
          }),
      ),
    );
    const { school } = decoded;
    const subjectIds = new Set(school.subjects.map((subject) => subject.id));
    const days = new Set(school.timetable.map((day) => day.day));
    if (
      subjectIds.size !== school.subjects.length ||
      days.size !== school.timetable.length ||
      school.subjects.some(
        (subject) => !(subject.id.trim() && subject.name.trim()),
      ) ||
      school.timetable.some(
        (day) =>
          new Set(day.subjectIds).size !== day.subjectIds.length ||
          day.subjectIds.some((subjectId) => !subjectIds.has(subjectId)),
      )
    ) {
      return yield* Effect.fail(
        new SchoolSettingsError({
          message:
            'Use unique subjects and days, and list each existing subject at most once per day.',
          status: 400,
        }),
      );
    }
    const sql = yield* PgClient.PgClient;
    const revision = crypto.randomUUID();
    const rows = yield* (
      decoded.revision === null
        ? sql`INSERT INTO school_settings (id, payload, revision) VALUES ('school', ${sql.json(school)}, ${revision}) ON CONFLICT (id) DO NOTHING RETURNING revision`
        : sql`UPDATE school_settings SET payload = ${sql.json(school)}, revision = ${revision} WHERE id = 'school' AND revision = ${decoded.revision} RETURNING revision`
    ).pipe(Effect.mapError(unavailable));
    if (rows.length !== 1) {
      return yield* Effect.fail(
        new SchoolSettingsError({
          message:
            'Your timetable changed in another browser. Reload before saving again.',
          status: 409,
        }),
      );
    }
    return { revision, school };
  });
