import { expect, it } from 'bun:test';
import { Effect, Schema } from 'effect';
import {
  acknowledgeHomework,
  enqueueHomework,
  getPendingHomework,
} from '../src/shared/homework/queue';
import { reconcileHomework } from '../src/shared/homework/reconcile';
import { reconcileReviewWeek } from '../src/shared/homework/review-week';
import { OCRResponse } from '../src/shared/types/schemas';
import { entry, options, runIsolated } from './support';

const nextWeek = '2026-W38';
const correctedDate = '2026-09-11';
for (const [label, correctedContent] of [
  ['its deadline', entry.content],
  ['its wording and deadline', `${entry.content} corrected`],
] as const) {
  it(`a rescan that reads the page as before keeps ${label} corrected before the first import`, async () => {
    const scan = (entries: ReadonlyArray<typeof entry>) =>
      Schema.decodeUnknownSync(OCRResponse)({
        weekId: options.weekId,
        confidence: 1,
        entries,
      });
    const newLine = { ...entry, id: 'review-2', content: 'New exercise' };
    const result = await runIsolated(
      Effect.gen(function* () {
        const [first] = (yield* reconcileHomework(scan([entry]))).entries;
        if (!first) {
          return null;
        }
        yield* enqueueHomework(
          [
            {
              ...first,
              id: 'review-1',
              content: correctedContent,
              dueDate: correctedDate,
            },
          ],
          options,
        );
        const [queued] = yield* getPendingHomework;
        if (!queued) {
          return null;
        }
        yield* acknowledgeHomework(
          queued.payload.id,
          queued.revision,
          'task-1',
        );
        const rescan = (yield* reconcileHomework(scan([entry, newLine])))
          .entries;
        yield* enqueueHomework(
          rescan
            .filter((item) => item.action !== 'skip')
            .map((item, index) => ({ ...item, id: `rescan-${index}` })),
          options,
        );
        return {
          rescan: rescan.map((item) => [
            item.action,
            item.content,
            item.dueDate,
            item.savedDueDate,
          ]),
          queued: (yield* getPendingHomework).map(
            (item) => item.payload.content,
          ),
        };
      }),
    );
    expect(result).toEqual({
      rescan: [
        // The entry keeps the date read; the list shows the saved one.
        ['skip', correctedContent, entry.dueDate, correctedDate],
        ['add', newLine.content, entry.dueDate, undefined],
      ],
      queued: [newLine.content],
    });
  });
}

it('a rescan that reads a new deadline after a corrected one shows it for review', async () => {
  const movedDate = '2026-09-12';
  const scan = (dueDate: string) =>
    Schema.decodeUnknownSync(OCRResponse)({
      weekId: options.weekId,
      confidence: 1,
      entries: [{ ...entry, dueDate }],
    });
  const result = await runIsolated(
    Effect.gen(function* () {
      const [first] = (yield* reconcileHomework(scan(entry.dueDate))).entries;
      if (!first) {
        return null;
      }
      yield* enqueueHomework(
        [{ ...first, id: 'review-1', dueDate: correctedDate }],
        options,
      );
      const rescan = (yield* reconcileHomework(scan(movedDate))).entries;
      return rescan.map(
        (item): ReadonlyArray<string | undefined> => [
          item.action,
          item.dueDate,
        ],
      );
    }),
  );
  expect(result).toEqual([['modify', movedDate]]);
});

it('applying the week to a rescan that reads the date as before recognizes the corrected homework', async () => {
  const scan = (weekId: string | null) =>
    Schema.decodeUnknownSync(OCRResponse)({
      weekId,
      confidence: 1,
      entries: [entry],
    });
  const result = await runIsolated(
    Effect.gen(function* () {
      const [first] = (yield* reconcileHomework(scan(options.weekId))).entries;
      if (!first) {
        return null;
      }
      yield* enqueueHomework(
        [{ ...first, id: 'review-1', dueDate: correctedDate }],
        options,
      );
      // The week is unreadable this time, so the rescan matches nothing yet.
      const rescan = (yield* reconcileHomework(scan(null))).entries;
      const reviewed = yield* reconcileReviewWeek(
        rescan.map((item) => ({ ...item, id: 'review-2' })),
        options.weekId,
      );
      return reviewed.map(
        (item): ReadonlyArray<string | null | undefined> => [
          item.action,
          item.dueDate,
          item.savedDueDate,
        ],
      );
    }),
  );
  expect(result).toEqual([['skip', entry.dueDate, correctedDate]]);
});

it('a rescan reports that homework saved without its misread deadline has none', async () => {
  const scan = () =>
    Schema.decodeUnknownSync(OCRResponse)({
      weekId: options.weekId,
      confidence: 1,
      entries: [entry],
    });
  const result = await runIsolated(
    Effect.gen(function* () {
      const [first] = (yield* reconcileHomework(scan())).entries;
      if (!first) {
        return null;
      }
      // The scan read a deadline that is not on the paper.
      yield* enqueueHomework(
        [{ ...first, id: 'review-1', dueDate: undefined }],
        options,
      );
      const rescan = (yield* reconcileHomework(scan())).entries;
      return rescan.map((item) => [item.action, item.savedDueDate]);
    }),
  );
  expect(result).toEqual([['skip', null]]);
});

it('a rescan that no longer reads a deadline saved from an older draft shows it for review', async () => {
  const scan = (dueDate: string | undefined) =>
    Schema.decodeUnknownSync(OCRResponse)({
      weekId: options.weekId,
      confidence: 1,
      entries: [{ ...entry, dueDate }],
    });
  const result = await runIsolated(
    Effect.gen(function* () {
      const [first] = (yield* reconcileHomework(scan(entry.dueDate))).entries;
      if (!first) {
        return null;
      }
      // A draft stored before PaperSync recorded the date the scan read.
      const { readDueDate: _, ...stored } = first;
      yield* enqueueHomework([{ ...stored, id: 'review-1' }], options);
      // The teacher removed the deadline.
      const rescan = (yield* reconcileHomework(scan(undefined))).entries;
      return rescan.map((item) => item.action);
    }),
  );
  expect(result).toEqual(['modify']);
});

for (const [label, edit, expected] of [
  ['starts from the date the scan read', undefined, entry.dueDate],
  ['keeps a date the student entered', '2026-09-12', '2026-09-12'],
] as const) {
  it(`applying another week to an entry matched in the scanned week ${label}`, async () => {
    const result = await runIsolated(
      Effect.gen(function* () {
        const [first] = (yield* reconcileHomework(
          Schema.decodeUnknownSync(OCRResponse)({
            weekId: options.weekId,
            confidence: 1,
            entries: [entry],
          }),
        )).entries;
        if (!first) {
          return null;
        }
        yield* enqueueHomework(
          [{ ...first, id: 'review-1', dueDate: correctedDate }],
          options,
        );
        // A page of the next week with the same line, read as this week.
        const [rescan] = (yield* reconcileHomework(
          Schema.decodeUnknownSync(OCRResponse)({
            weekId: options.weekId,
            confidence: 1,
            entries: [entry],
          }),
        )).entries;
        if (!rescan) {
          return null;
        }
        const reviewed = edit
          ? {
              ...rescan,
              id: 'review-2',
              action: 'modify' as const,
              dueDate: edit,
            }
          : { ...rescan, id: 'review-2' };
        const applied = yield* reconcileReviewWeek([reviewed], nextWeek);
        return applied.map(
          (item): ReadonlyArray<string | undefined> => [
            item.action,
            item.dueDate,
          ],
        );
      }),
    );
    expect(result).toEqual([['add', expected]]);
  });
}

const savedWithCorrectedDate = Effect.gen(function* () {
  const [first] = (yield* reconcileHomework(
    Schema.decodeUnknownSync(OCRResponse)({
      weekId: options.weekId,
      confidence: 1,
      entries: [entry],
    }),
  )).entries;
  if (!first) {
    return null;
  }
  yield* enqueueHomework(
    [{ ...first, id: 'review-1', dueDate: correctedDate }],
    options,
  );
  const [rescan] = (yield* reconcileHomework(
    Schema.decodeUnknownSync(OCRResponse)({
      weekId: options.weekId,
      confidence: 1,
      entries: [entry],
    }),
  )).entries;
  return rescan ?? null;
});

it('returning to the scanned week after applying another keeps the corrected date', async () => {
  const result = await runIsolated(
    Effect.gen(function* () {
      const rescan = yield* savedWithCorrectedDate;
      if (!rescan) {
        return null;
      }
      const other = yield* reconcileReviewWeek(
        [{ ...rescan, id: 'review-2' }],
        nextWeek,
      );
      const back = yield* reconcileReviewWeek(other, options.weekId);
      return back.map((item) => item.action);
    }),
  );
  expect(result).toEqual(['skip']);
});

it('a date the student entered survives applying weeks that match and then do not', async () => {
  const edit = '2026-09-12';
  const result = await runIsolated(
    Effect.gen(function* () {
      // Saved homework in the next week is already due on the date entered.
      yield* enqueueHomework([{ ...entry, dueDate: edit }], {
        weekId: nextWeek,
      });
      const rescan = yield* savedWithCorrectedDate;
      if (!rescan) {
        return null;
      }
      const edited = {
        ...rescan,
        id: 'review-2',
        action: 'modify' as const,
        dueDate: edit,
      };
      const matching = yield* reconcileReviewWeek([edited], nextWeek);
      const empty = yield* reconcileReviewWeek(matching, '2026-W39');
      return [...matching, ...empty].map(
        (item): ReadonlyArray<string | undefined> => [
          item.action,
          item.dueDate,
        ],
      );
    }),
  );
  expect(result).toEqual([
    ['skip', edit],
    ['add', edit],
  ]);
});

it('saving a saved entry reviewed for its wording keeps its corrected date', async () => {
  const result = await runIsolated(
    Effect.gen(function* () {
      const rescan = yield* savedWithCorrectedDate;
      if (!rescan) {
        return null;
      }
      yield* enqueueHomework(
        [{ ...rescan, id: 'review-2', content: `${entry.content} again` }],
        options,
      );
      return (yield* getPendingHomework).map((item) => [
        item.payload.content,
        item.payload.dueDate,
      ]);
    }),
  );
  expect(result).toEqual([[`${entry.content} again`, correctedDate]]);
});
