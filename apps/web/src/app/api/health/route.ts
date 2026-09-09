import { PgClient } from '@effect/sql-pg';
import { databaseRuntime } from '@papersync/db/runtime';
import { Effect } from 'effect';
import { getAuth } from '@/shared/auth/auth';

const unavailableStatus = 503;
export const GET = async () => {
  try {
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* getAuth;
        const sql = yield* PgClient.PgClient;
        yield* sql`SELECT id FROM homework LIMIT 0`;
        yield* sql`SELECT id FROM integration LIMIT 0`;
      }),
    );
    return Response.json(
      { status: 'ok' },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'unavailable' },
      { status: unavailableStatus, headers: { 'cache-control': 'no-store' } },
    );
  }
};
