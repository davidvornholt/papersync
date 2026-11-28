import { Effect, Fiber, Schema } from 'effect';
import { TaskAction, WeekId } from '@/shared/types/schemas';
import {
  ScanDraftConflictError,
  ScanDraftStoreError,
} from '../errors/scan-client';
import type { ScanPage } from './use-scan-types';

// The scan in progress lives in this browser until it is saved or cleared, so
// switching apps, a discarded tab, or a reload keeps it. Edits are refused in
// a tab whose copy another tab has changed since; see `makeScanDraftSession`.
// public/sw.js writes shared photos to the same store; keep both in sync.
const databaseName = 'papersync';
const databaseVersion = 1;
const storeName = 'scan-draft';
const pagesKey = 'pages';
const reviewKey = 'review';
const sharedKey = 'shared';
const revisionKey = 'revision';

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
  savedHomeworkIds: Schema.optional(Schema.Array(Schema.String)),
  readingId: Schema.optional(Schema.String),
  readDueDate: Schema.optional(Schema.NullOr(Schema.String)),
});
const StoredReview = Schema.Struct({
  weekId: Schema.NullOr(WeekId),
  jobId: Schema.NullOr(Schema.String),
  // Absent in drafts stored before PaperSync tracked photos added later.
  hasNewPages: Schema.optional(Schema.Boolean),
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

const emptyReview: StoredReview = {
  weekId: null,
  jobId: null,
  hasNewPages: false,
  result: null,
  entries: [],
};

const storeError = (cause: unknown) =>
  new ScanDraftStoreError({
    message: 'This browser could not keep the scan in progress.',
    cause,
  });

const openDatabase = Effect.callback<IDBDatabase, ScanDraftStoreError>(
  (resume) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName);
    };
    request.onsuccess = () => resume(Effect.succeed(request.result));
    request.onerror = () => resume(Effect.fail(storeError(request.error)));
  },
);
// One shared connection keeps writes in the order they were requested. It
// opens in its own fiber, so a caller that stops waiting cannot cancel it.
const openOnce = Effect.runSync(Effect.cached(Effect.forkDetach(openDatabase)));
const database = Effect.flatMap(openOnce, Fiber.join);

// `run` queues the requests and returns how to read the result once the
// transaction has committed.
const transact = <A>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => () => A,
) =>
  Effect.flatMap(database, (connection) =>
    Effect.callback<A, ScanDraftStoreError>((resume) => {
      const transaction = connection.transaction(storeName, mode);
      const result = run(transaction.objectStore(storeName));
      transaction.oncomplete = () => resume(Effect.succeed(result()));
      transaction.onerror = () =>
        resume(Effect.fail(storeError(transaction.error)));
      transaction.onabort = () =>
        resume(Effect.fail(storeError(transaction.error)));
    }),
  ).pipe(Effect.catchDefect((cause) => Effect.fail(storeError(cause))));

const decode = <A, I>(
  schema: Schema.Codec<A, I>,
  value: unknown,
  fallback: A,
) =>
  value === undefined
    ? Effect.succeed(fallback)
    : Schema.decodeUnknownEffect(schema)(value).pipe(
        // A draft from an older PaperSync version is discarded.
        Effect.orElseSucceed(() => fallback),
      );

const conflictMessage =
  'This scan was changed in another tab or window, so changes here are no longer kept. Reload to continue with the latest scan.';

const pagesFingerprint = (pages: ReadonlyArray<{ readonly id: string }>) =>
  JSON.stringify(pages.map((page) => page.id));
// The stored form drops extra fields and fixes the key order, and a draft
// from before `hasNewPages` means false, so a review reads and writes alike.
const encodeReview = (review: StoredReview) =>
  Schema.encodeEffect(StoredReview)({
    ...review,
    hasNewPages: review.hasNewPages ?? false,
  }).pipe(Effect.mapError(storeError));
const emptyPages = pagesFingerprint([]);
const emptyReviewFingerprint = JSON.stringify(
  Schema.encodeSync(StoredReview)(emptyReview),
);

// What one tab last read or wrote. `revision` is null until the tab has read
// the draft once. The fingerprints let a tab skip writing what it already
// stored, so showing Scan again or writing back a restored draft does not
// count as a change and make other tabs stale. `isStale` marks a tab that
// kept its own work over a stored scan it never showed.
type TabDraft = {
  revision: number | null;
  isStale: boolean;
  pages: string | null;
  review: string | null;
};

const storedRevision = (request: IDBRequest) =>
  typeof request.result === 'number' ? request.result : 0;

// `remember` records what the tab now has stored, once the write commits.
// `isUnchanged` runs inside the transaction, after this tab's earlier writes
// have committed, so it compares against what they stored.
const writeIfCurrent = (
  tab: TabDraft,
  apply: (store: IDBObjectStore) => void,
  remember: () => void,
  isUnchanged: () => boolean = () => false,
) =>
  transact('readwrite', (store) => {
    let next: number | null = null;
    let unchanged = false;
    const current = store.get(revisionKey);
    current.onsuccess = () => {
      unchanged = isUnchanged();
      const found = storedRevision(current);
      const isRefused =
        tab.isStale || (tab.revision !== null && found !== tab.revision);
      if (unchanged || isRefused) {
        return;
      }
      apply(store);
      next = found + 1;
      store.put(next, revisionKey);
    };
    // The next queued write from this tab starts only after this commit, so
    // it already compares against the revision recorded here.
    return () => {
      if (next === null) {
        return unchanged;
      }
      tab.revision = next;
      remember();
      return true;
    };
  }).pipe(
    Effect.flatMap((written) =>
      written
        ? Effect.void
        : Effect.fail(new ScanDraftConflictError({ message: conflictMessage })),
    ),
  );

const readDraft = (tab: TabDraft) =>
  transact('readonly', (store) => {
    const pages = store.get(pagesKey);
    const review = store.get(reviewKey);
    const current = store.get(revisionKey);
    return () => ({
      pages: pages.result as unknown,
      review: review.result as unknown,
      revision: storedRevision(current),
    });
  }).pipe(
    Effect.flatMap((stored) =>
      Effect.all({
        pages: decode(StoredPages, stored.pages, []),
        review: decode(StoredReview, stored.review, emptyReview),
      }).pipe(
        Effect.tap((draft) =>
          Effect.flatMap(encodeReview(draft.review), (encoded) =>
            Effect.sync(() => {
              tab.revision = stored.revision;
              tab.isStale = false;
              tab.pages = pagesFingerprint(draft.pages);
              tab.review = JSON.stringify(encoded);
            }),
          ),
        ),
      ),
    ),
  );

/** Drop the photos a save read and the review in one step, keeping the rest. */
const clearSavedDraft = (tab: TabDraft, saved: ReadonlyArray<ScanPage>) => {
  const savedIds = new Set(saved.map((page) => page.id));
  let kept: ReadonlyArray<{ readonly id: string }> = [];
  return writeIfCurrent(
    tab,
    (store) => {
      const stored = store.get(pagesKey);
      stored.onsuccess = () => {
        const { result }: { readonly result: unknown } = stored;
        kept = Schema.is(StoredPages)(result)
          ? result.filter((page) => !savedIds.has(page.id))
          : [];
        store.put(kept, pagesKey);
      };
      store.delete(reviewKey);
    },
    () => {
      tab.pages = pagesFingerprint(kept);
      tab.review = emptyReviewFingerprint;
    },
  );
};

/**
 * One tab's handle on the stored draft. Every write raises the stored
 * revision, and a tab may only write over the revision it last read or wrote,
 * so a tab holding an older copy is refused instead of erasing another tab's
 * newer photos or review.
 */
export const makeScanDraftSession = () => {
  const tab: TabDraft = {
    revision: null,
    isStale: false,
    pages: null,
    review: null,
  };
  return {
    read: readDraft(tab),
    /**
     * Call instead of restoring what `read` returned. A tab that keeps its own
     * work may not write over a stored scan it never showed.
     */
    keepLocalWork: () => {
      if (tab.pages !== emptyPages || tab.review !== emptyReviewFingerprint) {
        tab.isStale = true;
      }
    },
    writePages: (pages: ReadonlyArray<ScanPage>) => {
      // A page's image never changes under the same id.
      const fingerprint = pagesFingerprint(pages);
      return writeIfCurrent(
        tab,
        (store) =>
          store.put(
            pages.map(({ id, image }) => ({ id, image })),
            pagesKey,
          ),
        () => {
          tab.pages = fingerprint;
        },
        () => fingerprint === tab.pages,
      );
    },
    writeReview: (review: StoredReview) =>
      Effect.flatMap(encodeReview(review), (encoded) => {
        const fingerprint = JSON.stringify(encoded);
        return writeIfCurrent(
          tab,
          (store) => store.put(encoded, reviewKey),
          () => {
            tab.review = fingerprint;
          },
          () => fingerprint === tab.review,
        );
      }),
    /** Commit the reset before the page reports a cleared scan. */
    clear: writeIfCurrent(
      tab,
      (store) => {
        store.delete(pagesKey);
        store.delete(reviewKey);
      },
      () => {
        tab.pages = emptyPages;
        tab.review = emptyReviewFingerprint;
      },
    ),
    clearSaved: (saved: ReadonlyArray<ScanPage>) => clearSavedDraft(tab, saved),
  };
};

/** This tab's scan draft. */
export const scanDraft = makeScanDraftSession();

const SharedPhotos = Schema.Array(Schema.instanceOf(Blob));

/** Removes and returns photos shared to PaperSync since Scan last looked. */
export const takeSharedPhotos = transact('readwrite', (store) => {
  const waiting = store.get(sharedKey);
  store.delete(sharedKey);
  return () => waiting.result as unknown;
}).pipe(
  Effect.flatMap((value) =>
    value === undefined
      ? Effect.succeed([])
      : Schema.decodeUnknownEffect(SharedPhotos)(value).pipe(
          Effect.orElseSucceed((): ReadonlyArray<Blob> => []),
        ),
  ),
);
