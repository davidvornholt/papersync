import { expect, it } from 'bun:test';
import { PgClient } from '@effect/sql-pg';
import { databaseRuntime } from '@papersync/db/runtime';
import { Effect } from 'effect';
import {
  isConnectionAuthorized,
  revokeConnectionKey,
  rotateConnectionKey,
} from '../src/shared/homework/connection';
import {
  acknowledgeHomework,
  enqueueHomework,
  getPendingHomework,
} from '../src/shared/homework/queue';

const runIsolated = <A, E>(program: Effect.Effect<A, E, PgClient.PgClient>) =>
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

const entry = {
  id: 'review-1',
  day: 'Monday',
  subject: 'Math',
  content: `Integration homework ${crypto.randomUUID()}`,
  isTask: true,
  isCompleted: false,
  isNew: true,
  dueDate: '2026-09-10',
};
const options = { weekId: '2026-W37' };

it('queue retries deduplicate, while stale acknowledgements cannot erase a revised due date', async () => {
  const result = await runIsolated(
    Effect.gen(function* () {
      yield* enqueueHomework([entry], options);
      yield* enqueueHomework([entry], options);
      const pending = (yield* getPendingHomework).filter(
        (item) => item.payload.content === entry.content,
      );
      const [original] = pending;
      if (!original) {
        return { pending };
      }
      yield* enqueueHomework([{ ...entry, dueDate: '2026-09-11' }], options);
      yield* acknowledgeHomework(
        original.payload.id,
        original.revision,
        'imported-task',
      );
      const revised = (yield* getPendingHomework).find(
        (item) => item.payload.id === original.payload.id,
      );
      if (!revised) {
        return { pending };
      }
      yield* acknowledgeHomework(
        revised.payload.id,
        revised.revision,
        'imported-task',
      );
      yield* enqueueHomework([{ ...entry, dueDate: '2026-09-11' }], options);
      const remaining = (yield* getPendingHomework).filter(
        (item) => item.payload.id === original.payload.id,
      );
      return { pending, revised, remaining };
    }),
  );
  expect(result.pending).toHaveLength(1);
  expect(result.revised?.payload.dueDate).toBe('2026-09-11');
  expect(result.remaining).toEqual([]);
});

it('rotating or revoking the plugin key invalidates previous credentials', async () => {
  const result = await runIsolated(
    Effect.gen(function* () {
      const first = yield* rotateConnectionKey;
      const isFirstAccepted = yield* isConnectionAuthorized(first);
      const second = yield* rotateConnectionKey;
      const isOldAccepted = yield* isConnectionAuthorized(first);
      const isNewAccepted = yield* isConnectionAuthorized(second);
      yield* revokeConnectionKey;
      const isRevokedAccepted = yield* isConnectionAuthorized(second);
      return {
        isFirstAccepted,
        isOldAccepted,
        isNewAccepted,
        isRevokedAccepted,
      };
    }),
  );
  expect(result).toEqual({
    isFirstAccepted: true,
    isOldAccepted: false,
    isNewAccepted: true,
    isRevokedAccepted: false,
  });
});
