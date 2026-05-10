'use server';

import { Effect } from 'effect';
import { checkSuperProductivityHealth } from '../services/super-productivity';

export type TestSuperProductivityResult =
  | { readonly ok: true; readonly endpoint: string }
  | { readonly ok: false; readonly error: string };

export const testSuperProductivityConnection = async (
  endpoint: string | undefined,
): Promise<TestSuperProductivityResult> => {
  const trimmed = endpoint?.trim();
  return Effect.runPromise(
    checkSuperProductivityHealth(trimmed).pipe(
      Effect.map(
        (): TestSuperProductivityResult => ({
          ok: true,
          endpoint: trimmed ?? '',
        }),
      ),
      Effect.catchAll((error) =>
        Effect.succeed<TestSuperProductivityResult>({
          ok: false,
          error: error.message,
        }),
      ),
    ),
  );
};
