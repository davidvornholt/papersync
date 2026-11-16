import { PgClient } from '@effect/sql-pg';
import { databaseRuntime } from '@papersync/db/runtime';
import { Effect } from 'effect';

export const runIsolated = <A, E>(
  program: Effect.Effect<A, E, PgClient.PgClient>,
) =>
  databaseRuntime.runPromise(
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient;
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`CREATE TEMP TABLE homework (LIKE public.homework INCLUDING ALL) ON COMMIT DROP`;
          yield* sql`CREATE TEMP TABLE integration (LIKE public.integration INCLUDING ALL) ON COMMIT DROP`;
          return yield* program;
        }),
      );
    }),
  );

export const entry = {
  id: 'review-1',
  day: 'Monday',
  subject: 'Math',
  content: `Integration homework ${crypto.randomUUID()}`,
  action: 'add' as const,
  dueDate: '2026-09-10',
};
export const options = { weekId: '2026-W37' };
