// biome-ignore lint/nursery/noBunModules: This integration entrypoint runs only under Bun, via test:integration.
import { expect, it } from 'bun:test';
import { PgClient } from '@effect/sql-pg';
import { databaseRuntime } from '@papersync/db/runtime';
import { Effect } from 'effect';
import {
  loadSchoolSettings,
  saveSchoolSettings,
} from '../src/shared/settings/repository';

const school = {
  subjects: [{ id: 'math', name: 'Mathematics' }],
  timetable: [
    {
      day: 'monday',
      slots: [
        { id: 'one', subjectId: null },
        { id: 'two', subjectId: 'math' },
      ],
    },
  ],
};

it('persists free periods and prevents stale browsers from replacing a saved timetable', async () => {
  await databaseRuntime.runPromise(
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient;
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`CREATE TEMP TABLE school_settings (LIKE public.school_settings INCLUDING ALL) ON COMMIT DROP`;
          expect(yield* loadSchoolSettings).toEqual({
            revision: null,
            school: null,
          });
          const initial = yield* saveSchoolSettings({ revision: null, school });
          expect(yield* loadSchoolSettings).toEqual(initial);
          const staleFirstSave = yield* saveSchoolSettings({
            revision: null,
            school,
          }).pipe(Effect.either);
          expect(staleFirstSave._tag).toBe('Left');
          const updated = yield* saveSchoolSettings({
            revision: initial.revision,
            school: { ...school, subjects: [{ id: 'math', name: 'Math' }] },
          });
          const stale = yield* saveSchoolSettings({
            revision: initial.revision,
            school,
          }).pipe(Effect.either);
          expect(stale._tag).toBe('Left');
          expect(stale).toMatchObject({ _tag: 'Left', left: { status: 409 } });
          expect(yield* loadSchoolSettings).toEqual(updated);
        }),
      );
    }),
  );
});

it('rejects unknown subjects, duplicate days, and browser credentials without writing', async () => {
  await databaseRuntime.runPromise(
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient;
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`CREATE TEMP TABLE school_settings (LIKE public.school_settings INCLUDING ALL) ON COMMIT DROP`;
          const invalidSchools = [
            { ...school, subjects: [] },
            {
              ...school,
              timetable: [...school.timetable, ...school.timetable],
            },
            { ...school, ai: { googleApiKey: 'must-not-be-stored' } },
          ];
          for (const invalid of invalidSchools) {
            const result = yield* saveSchoolSettings({
              revision: null,
              school: invalid,
            }).pipe(Effect.either);
            expect(result._tag).toBe('Left');
            expect(result).toMatchObject({
              _tag: 'Left',
              left: { status: 400 },
            });
          }
          expect(yield* loadSchoolSettings).toEqual({
            revision: null,
            school: null,
          });
        }),
      );
    }),
  );
});
