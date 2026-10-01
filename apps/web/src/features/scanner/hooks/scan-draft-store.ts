import { Effect, Schema } from 'effect';
import { TaskAction, WeekId } from '@/shared/types/schemas';
import { ScanDraftStoreError } from '../errors/scan-client';
import type { ScanPage } from './use-scan-types';

// The scan in progress lives in this browser until it is saved or cleared, so
// switching apps, a discarded tab, or a reload never loses photos or edits.
const databaseName = 'papersync';
const databaseVersion = 1;
const storeName = 'scan-draft';
const pagesKey = 'pages';
const reviewKey = 'review';

const StoredPages = Schema.Array(
  Schema.Struct({ id: Schema.String, image: Schema.instanceOf(Blob) }),
);
const StoredEntry = Schema.Struct({
  id: Schema.String,
  day: Schema.String,
  subject: Schema.String,
  content: Schema.String,
  action: TaskAction,
  dueDate: Schema.optional(Schema.String),
});
const StoredReview = Schema.Struct({
  weekId: Schema.NullOr(WeekId),
  jobId: Schema.NullOr(Schema.String),
  result: Schema.NullOr(
    Schema.Struct({
      weekId: Schema.NullOr(WeekId),
      confidence: Schema.Number,
      modelUsed: Schema.String,
      notes: Schema.optional(Schema.String),
    }),
  ),
  entries: Schema.Array(StoredEntry),
});
export type StoredReview = typeof StoredReview.Type;

export const emptyReview: StoredReview = {
  weekId: null,
  jobId: null,
  result: null,
  entries: [],
};

const storeError = (cause: unknown) =>
  new ScanDraftStoreError({
    message: 'This browser could not keep the scan in progress.',
    cause,
  });

const openDatabase = Effect.async<IDBDatabase, ScanDraftStoreError>(
  (resume) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName);
    };
    request.onsuccess = () => resume(Effect.succeed(request.result));
    request.onerror = () => resume(Effect.fail(storeError(request.error)));
  },
);
// One shared connection keeps writes in the order they were requested.
const database = Effect.runSync(Effect.cached(openDatabase));

const transact = <A>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<A>,
) =>
  Effect.flatMap(database, (connection) =>
    Effect.async<A, ScanDraftStoreError>((resume) => {
      const transaction = connection.transaction(storeName, mode);
      const request = run(transaction.objectStore(storeName));
      transaction.oncomplete = () => resume(Effect.succeed(request.result));
      transaction.onerror = () =>
        resume(Effect.fail(storeError(transaction.error)));
      transaction.onabort = () =>
        resume(Effect.fail(storeError(transaction.error)));
    }),
  ).pipe(Effect.catchAllDefect((cause) => Effect.fail(storeError(cause))));

const read = <A, I>(key: string, schema: Schema.Schema<A, I>, fallback: A) =>
  transact('readonly', (store) => store.get(key)).pipe(
    Effect.flatMap((value) =>
      value === undefined
        ? Effect.succeed(fallback)
        : Schema.decodeUnknown(schema)(value).pipe(
            // A draft from an older PaperSync version is discarded.
            Effect.orElseSucceed(() => fallback),
          ),
    ),
  );

export const readScanDraft = Effect.all({
  pages: read(pagesKey, StoredPages, []),
  review: read(reviewKey, StoredReview, emptyReview),
});

export const writeScanPages = (pages: ReadonlyArray<ScanPage>) =>
  transact('readwrite', (store) =>
    store.put(
      pages.map(({ id, image }) => ({ id, image })),
      pagesKey,
    ),
  );

export const writeScanReview = (review: StoredReview) =>
  transact('readwrite', (store) => store.put(review, reviewKey));
