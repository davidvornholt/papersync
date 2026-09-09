import { PgClient } from '@effect/sql-pg';
import { hashContent } from '@papersync/homework/identity';
import { Effect } from 'effect';
export const rotateConnectionKey = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const hash = yield* hashContent(token);
  yield* sql`INSERT INTO integration (id, token_hash) VALUES ('super-productivity', ${hash}) ON CONFLICT (id) DO UPDATE SET token_hash = EXCLUDED.token_hash`;
  return token;
});
export const hasConnectionKey = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  const rows =
    yield* sql`SELECT id FROM integration WHERE id = 'super-productivity'`;
  return rows.length > 0;
});
export const isConnectionAuthorized = (token: string) =>
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;
    const hash = yield* hashContent(token);
    const rows =
      yield* sql`SELECT id FROM integration WHERE id = 'super-productivity' AND token_hash = ${hash}`;
    return rows.length === 1;
  });
export const revokeConnectionKey = Effect.gen(function* () {
  const sql = yield* PgClient.PgClient;
  yield* sql`DELETE FROM integration WHERE id = 'super-productivity'`;
});
