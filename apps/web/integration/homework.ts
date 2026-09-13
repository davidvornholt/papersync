import { expect, it } from 'bun:test';
import { PgClient } from '@effect/sql-pg';
import { databaseRuntime } from '@papersync/db/runtime';
import { Effect, Schema } from 'effect';
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
import { reconcileHomework } from '../src/shared/homework/reconcile';
import { reconcileReviewWeek } from '../src/shared/homework/review-week';
import { OCRResponse, type TaskAction } from '../src/shared/types/schemas';

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
  action: 'add' as const,
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

it('rescans separate saved homework from new entries and changed paper details', async () => {
  const response = Schema.decodeUnknownSync(OCRResponse)({
    weekId: options.weekId,
    confidence: 1,
    entries: [
      entry,
      { ...entry, content: `  ${entry.content}  ` },
      { ...entry, content: 'An additional assignment' },
      { ...entry, isCompleted: true },
      { ...entry, dueDate: '2026-09-11' },
      { ...entry, dueDate: undefined },
      { ...entry, isTask: false },
    ],
  });
  const result = await runIsolated(
    Effect.gen(function* () {
      yield* enqueueHomework([entry], options);
      const queued = yield* reconcileHomework(response);
      const pending = yield* getPendingHomework;
      for (const item of pending) {
        yield* acknowledgeHomework(
          item.payload.id,
          item.revision,
          'imported-task',
        );
      }
      const imported = yield* reconcileHomework(response);
      const otherWeek = yield* reconcileHomework({
        ...response,
        weekId: Schema.decodeUnknownSync(OCRResponse.fields.weekId)('2026-W38'),
      });
      const unknownWeek = yield* reconcileHomework({
        ...response,
        weekId: null,
      });
      const remaining = yield* getPendingHomework;
      return { queued, imported, otherWeek, unknownWeek, remaining };
    }),
  );
  const expected: Array<TaskAction> = [
    'skip',
    'skip',
    'add',
    'modify',
    'modify',
    'modify',
    'add',
  ];
  expect(result.queued.entries.map((item) => item.action)).toEqual(expected);
  expect(result.imported.entries.map((item) => item.action)).toEqual(expected);
  expect(result.imported.entries[1]?.content).toBe(entry.content);
  expect(result.otherWeek.entries.every((item) => item.action === 'add')).toBe(
    true,
  );
  expect(result.unknownWeek).toEqual({ ...response, weekId: null });
  expect(result.remaining).toEqual([]);
});

it('changing a reviewed week rechecks duplicates and preserves edits without queue writes', async () => {
  const result = await runIsolated(
    Effect.gen(function* () {
      yield* enqueueHomework([entry], options);
      const edited = {
        ...entry,
        id: 'stable-review-id',
        content: `  ${entry.content}  `,
      };
      const sameWeek = yield* reconcileReviewWeek([edited], options.weekId);
      const otherWeek = yield* reconcileReviewWeek(sameWeek, '2026-W38');
      const changed = yield* reconcileReviewWeek(
        [{ ...edited, isCompleted: true, dueDate: '2026-09-12' }],
        options.weekId,
      );
      const invalid = yield* reconcileReviewWeek([edited], 'invalid').pipe(
        Effect.either,
      );
      return {
        edited,
        sameWeek,
        otherWeek,
        changed,
        invalid,
        pending: yield* getPendingHomework,
      };
    }),
  );
  expect(result.sameWeek).toEqual([{ ...result.edited, action: 'skip' }]);
  expect(result.otherWeek).toEqual([{ ...result.edited, action: 'add' }]);
  expect(result.changed).toEqual([
    {
      ...result.edited,
      action: 'modify',
      isCompleted: true,
      dueDate: '2026-09-12',
    },
  ]);
  expect(result.invalid._tag).toBe('Left');
  expect(result.pending).toHaveLength(1);
  expect(result.pending[0].payload.isCompleted).toBe(false);
});
