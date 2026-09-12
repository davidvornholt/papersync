'use server';

import { databaseRuntime } from '@papersync/db/runtime';
import { Effect } from 'effect';
import { requireSession } from '@/shared/auth/session';
import {
  hasConnectionKey,
  revokeConnectionKey,
  rotateConnectionKey,
} from './connection';
import type { ExtractedEntry } from './entry';
import { enqueueHomework, getPendingHomework } from './queue';
export const getConnectionStatus = async () => {
  await requireSession();
  return databaseRuntime.runPromise(
    Effect.gen(function* () {
      const isConnected = yield* hasConnectionKey;
      const pending = yield* getPendingHomework;
      return { isConnected, pendingCount: pending.length };
    }),
  );
};
export const createConnectionKey = async () => {
  await requireSession();
  return databaseRuntime.runPromise(rotateConnectionKey);
};
export const removeConnectionKey = async () => {
  await requireSession();
  return databaseRuntime.runPromise(revokeConnectionKey);
};

export const saveHomework = async (
  entries: ReadonlyArray<ExtractedEntry>,
  weekId: string,
) => {
  await requireSession();
  return databaseRuntime.runPromise(
    enqueueHomework(entries, { weekId }).pipe(
      Effect.map((count) => ({ success: true as const, count })),
      Effect.catchAll((error) =>
        Effect.succeed({ success: false as const, error: error.message }),
      ),
    ),
  );
};
