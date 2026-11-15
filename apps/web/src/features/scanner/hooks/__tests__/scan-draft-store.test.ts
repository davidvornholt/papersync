import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { WeekId } from '@/shared/types/schemas';
import { makeScanDraftSession, type StoredReview } from '../scan-draft-store';

// Each session stands for one browser tab sharing the same stored draft.
const photo = (id: string) => ({
  id,
  image: new Blob([`synthetic photo ${id}`], { type: 'image/png' }),
});
const week = WeekId.make('2026-W46');
const review = (content: string): StoredReview => ({
  weekId: week,
  jobId: null,
  hasNewPages: false,
  result: { weekId: week, confidence: 1, modelUsed: 'local-test' },
  entries: [
    { id: 'entry-1', day: 'Monday', subject: 'Math', content, action: 'add' },
  ],
});
// The review the scan page stores before anything is scanned.
const idleReview: StoredReview = {
  weekId: null,
  jobId: null,
  hasNewPages: false,
  result: null,
  entries: [],
};
// Stores a value as another PaperSync version or public/sw.js would.
const putStored = (key: string, value: unknown) =>
  new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('papersync');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const transaction = open.result.transaction('scan-draft', 'readwrite');
      transaction.objectStore('scan-draft').put(value, key);
      transaction.oncomplete = () => {
        open.result.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
const pageIds = (draft: { readonly pages: ReadonlyArray<{ id: string }> }) =>
  draft.pages.map((page) => page.id);
const run = Effect.runPromise;
const failureTag = <A, E extends { readonly _tag: string }>(
  effect: Effect.Effect<A, E>,
) =>
  run(
    effect.pipe(
      Effect.match({ onFailure: (error) => error._tag, onSuccess: () => null }),
    ),
  );

beforeEach(async () => {
  const fresh = makeScanDraftSession();
  await run(fresh.read);
  await run(fresh.clear);
});

it('refuses a stale tab’s photos instead of replacing another tab’s new photo', async () => {
  const tabA = makeScanDraftSession();
  const tabB = makeScanDraftSession();
  await run(tabA.writePages([photo('photo-a')]));
  const { pages } = await run(tabA.read);
  await run(tabB.read);

  await run(tabA.writePages([...pages, photo('photo-b')]));
  const refused = await failureTag(
    tabB.writePages([...pages, photo('photo-c')]),
  );

  expect(refused).toBe('ScanDraftConflictError');
  expect(pageIds(await run(makeScanDraftSession().read))).toEqual([
    'photo-a',
    'photo-b',
  ]);
});

it('keeps another tab’s newer review when a stale tab saves its older scan', async () => {
  const tabA = makeScanDraftSession();
  const tabB = makeScanDraftSession();
  await run(tabA.read);
  await run(tabA.writePages([photo('photo-a')]));
  await run(tabA.writeReview(review('Old task in tab A')));
  const older = await run(tabA.read);

  await run(tabB.read);
  await run(tabB.writePages([photo('photo-b')]));
  await run(tabB.writeReview(review('Corrected task in tab B')));
  const refused = await failureTag(tabA.clearSaved(older.pages));

  expect(refused).toBe('ScanDraftConflictError');
  const after = await run(makeScanDraftSession().read);
  expect(pageIds(after)).toEqual(['photo-b']);
  expect(after.review.entries.map((entry) => entry.content)).toEqual([
    'Corrected task in tab B',
  ]);
  // The stale tab's reset autosave is refused as well.
  expect(await failureTag(tabA.writePages([]))).toBe('ScanDraftConflictError');
  expect(pageIds(await run(makeScanDraftSession().read))).toEqual(['photo-b']);
});

it('keeps one tab’s own writes in order, including writes sent together', async () => {
  const tab = makeScanDraftSession();
  await run(tab.read);
  await run(
    Effect.all(
      [tab.writePages([photo('photo-a')]), tab.writeReview(review('Task'))],
      { concurrency: 'unbounded' },
    ),
  );
  await run(tab.writePages([photo('photo-a'), photo('photo-b')]));
  await run(tab.clearSaved([photo('photo-a')]));

  const after = await run(makeScanDraftSession().read);
  expect(pageIds(after)).toEqual(['photo-b']);
  expect(after.review.entries).toEqual([]);
});

it('does not make other tabs stale by writing back the draft it restored', async () => {
  const tabA = makeScanDraftSession();
  const tabB = makeScanDraftSession();
  await run(tabA.read);
  await run(tabA.writePages([photo('photo-a')]));
  await run(tabA.writeReview(review('Task')));

  const restored = await run(tabB.read);
  await run(tabB.writePages(restored.pages));
  await run(tabB.writeReview(restored.review));
  await run(tabA.writePages([photo('photo-a'), photo('photo-b')]));

  expect(pageIds(await run(makeScanDraftSession().read))).toEqual([
    'photo-a',
    'photo-b',
  ]);
});

it('keeps a photo removed right after it was added', async () => {
  const tab = makeScanDraftSession();
  await run(tab.read);
  await run(
    Effect.all([tab.writePages([photo('photo-a')]), tab.writePages([])], {
      concurrency: 'unbounded',
    }),
  );

  expect(pageIds(await run(makeScanDraftSession().read))).toEqual([]);
});

it('keeps a review edit undone right after it was made', async () => {
  const tab = makeScanDraftSession();
  await run(tab.read);
  await run(tab.writeReview(review('Task')));
  await run(
    Effect.all(
      [tab.writeReview(review('Edited task')), tab.writeReview(review('Task'))],
      { concurrency: 'unbounded' },
    ),
  );

  const after = await run(makeScanDraftSession().read);
  expect(after.review.entries.map((entry) => entry.content)).toEqual(['Task']);
});

it('keeps two tabs opened on an empty scan current until one edits', async () => {
  const tabA = makeScanDraftSession();
  const tabB = makeScanDraftSession();
  await run(tabA.read);
  await run(tabB.read);
  // What each tab's autosave writes back while nothing has been scanned.
  await run(
    Effect.all([
      tabA.writePages([]),
      tabA.writeReview(idleReview),
      tabB.writePages([]),
      tabB.writeReview(idleReview),
    ]),
  );

  await run(tabB.writePages([photo('photo-b')]));
  expect(pageIds(await run(makeScanDraftSession().read))).toEqual(['photo-b']);
});

it('keeps tabs current when they write back a draft from an older version', async () => {
  // Drafts stored before PaperSync tracked photos added later lack the flag.
  const { hasNewPages: _, ...older } = review('Task');
  await putStored('review', older);
  const tabA = makeScanDraftSession();
  const tabB = makeScanDraftSession();
  const restored = await run(tabA.read);
  await run(tabB.read);
  await run(tabA.writeReview({ ...restored.review, hasNewPages: false }));

  await run(tabB.writePages([photo('photo-b')]));
  expect(pageIds(await run(makeScanDraftSession().read))).toEqual(['photo-b']);
});
