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

it('a rescan recognizes homework whose reading was corrected before its first save', async () => {
  const misread = { ...entry, content: `${entry.content} 1–8` };
  const correction = `${entry.content} 1–3`;
  const newLine = { ...entry, id: 'review-2', content: 'Read page 12' };
  const scan = (entries: ReadonlyArray<typeof entry>) =>
    Schema.decodeUnknownSync(OCRResponse)({
      weekId: options.weekId,
      confidence: 1,
      entries,
    });
  const result = await runIsolated(
    Effect.gen(function* () {
      const [first] = (yield* reconcileHomework(scan([misread]))).entries;
      if (!first) {
        return null;
      }
      // Correct the misreading, then apply the week again before saving.
      const reviewed = yield* reconcileReviewWeek(
        [{ ...first, id: 'review-1', content: correction }],
        options.weekId,
      );
      yield* enqueueHomework(reviewed, options);
      const [queued] = yield* getPendingHomework;
      if (!queued) {
        return null;
      }
      yield* acknowledgeHomework(
        queued.payload.id,
        queued.revision,
        'imported-task',
      );
      const rescan = (yield* reconcileHomework(scan([misread, newLine])))
        .entries;
      yield* enqueueHomework(
        rescan
          .filter((item) => item.action !== 'skip')
          .map((item, index) => ({ ...item, id: `rescan-${index}` })),
        options,
      );
      const afterRescan = yield* getPendingHomework;
      // A later correction of the recognized entry still updates its task.
      const [recognized] = rescan;
      if (!recognized) {
        return null;
      }
      yield* enqueueHomework(
        [{ ...recognized, id: 'rescan-1', content: `${correction} again` }],
        options,
      );
      return {
        queued,
        rescan,
        afterRescan,
        afterCorrection: yield* getPendingHomework,
      };
    }),
  );
  if (!result) {
    throw new Error('The first save was not queued.');
  }
  const { id } = result.queued.payload;
  expect(result.queued.payload.content).toBe(correction);
  expect(
    result.rescan.map((item) => [
      item.action,
      item.content,
      item.savedHomeworkIds,
    ]),
  ).toEqual([
    ['skip', correction, [id]],
    ['add', newLine.content, undefined],
  ]);
  expect(result.afterRescan.map((item) => item.payload.content)).toEqual([
    newLine.content,
  ]);
  expect(
    result.afterCorrection
      .filter((item) => item.payload.id === id)
      .map((item) => item.payload.content),
  ).toEqual([`${correction} again`]);
  expect(result.afterCorrection).toHaveLength(2);
});

const nextWeek = '2026-W38';
for (const [label, scannedWeek] of [
  ['a wrong', options.weekId],
  ['an unreadable', null],
] as const) {
  it(`a rescan recognizes a corrected reading after ${label} week was corrected`, async () => {
    const misread = { ...entry, content: `${entry.content} 1–8` };
    const correction = `${entry.content} 1–3`;
    const newLine = { ...entry, id: 'review-2', content: 'Read page 12' };
    const scan = (
      weekId: string | null,
      entries: ReadonlyArray<typeof entry>,
    ) =>
      Schema.decodeUnknownSync(OCRResponse)({ weekId, confidence: 1, entries });
    const result = await runIsolated(
      Effect.gen(function* () {
        const [first] = (yield* reconcileHomework(scan(scannedWeek, [misread])))
          .entries;
        if (!first) {
          return null;
        }
        const reviewed = yield* reconcileReviewWeek(
          [{ ...first, id: 'review-1', content: correction }],
          nextWeek,
        );
        yield* enqueueHomework(reviewed, { weekId: nextWeek });
        const rescan = (yield* reconcileHomework(
          scan(nextWeek, [misread, newLine]),
        )).entries;
        return rescan.map((item) => [item.action, item.content]);
      }),
    );
    expect(result).toEqual([
      ['skip', correction],
      ['add', newLine.content],
    ]);
  });
}

it('applying the week to an unedited rescan keeps the saved correction', async () => {
  const misread = { ...entry, content: `${entry.content} 1–8` };
  const correction = `${entry.content} 1–3`;
  const scan = (weekId: string | null, dueDate: string) =>
    Schema.decodeUnknownSync(OCRResponse)({
      weekId,
      confidence: 1,
      entries: [{ ...misread, dueDate }],
    });
  const result = await runIsolated(
    Effect.gen(function* () {
      const [first] = (yield* reconcileHomework(
        scan(options.weekId, entry.dueDate),
      )).entries;
      if (!first) {
        return null;
      }
      yield* enqueueHomework(
        [{ ...first, id: 'review-1', content: correction }],
        options,
      );
      const [queued] = yield* getPendingHomework;
      if (!queued) {
        return null;
      }
      yield* acknowledgeHomework(queued.payload.id, queued.revision, 'task-1');
      // The week is unreadable this time, and the teacher moved the date.
      const rescan = (yield* reconcileHomework(scan(null, '2026-09-11')))
        .entries;
      const reviewed = yield* reconcileReviewWeek(
        rescan.map((item) => ({ ...item, id: 'review-2' })),
        options.weekId,
      );
      yield* enqueueHomework(reviewed, options);
      return {
        id: queued.payload.id,
        reviewed,
        after: yield* getPendingHomework,
      };
    }),
  );
  expect(result?.reviewed.map((item) => [item.action, item.content])).toEqual([
    ['modify', correction],
  ]);
  expect(
    result?.after.map((item) => [
      item.payload.id,
      item.payload.content,
      item.payload.dueDate,
    ]),
  ).toEqual([[result?.id, correction, '2026-09-11']]);
});

it('an edit made before applying an unreadable week corrects the saved homework', async () => {
  const misread = { ...entry, content: `${entry.content} 1–8` };
  const correction = `${entry.content} 1–3`;
  const edit = `${entry.content} 1–4`;
  const scan = (weekId: string | null) =>
    Schema.decodeUnknownSync(OCRResponse)({
      weekId,
      confidence: 1,
      entries: [misread],
    });
  const result = await runIsolated(
    Effect.gen(function* () {
      const [first] = (yield* reconcileHomework(scan(options.weekId))).entries;
      if (!first) {
        return null;
      }
      yield* enqueueHomework(
        [{ ...first, id: 'review-1', content: correction }],
        options,
      );
      const [queued] = yield* getPendingHomework;
      if (!queued) {
        return null;
      }
      yield* acknowledgeHomework(queued.payload.id, queued.revision, 'task-1');
      const [rescan] = (yield* reconcileHomework(scan(null))).entries;
      if (!rescan) {
        return null;
      }
      const reviewed = yield* reconcileReviewWeek(
        [{ ...rescan, id: 'review-2', content: edit }],
        options.weekId,
      );
      yield* enqueueHomework(
        reviewed.filter((item) => item.action !== 'skip'),
        options,
      );
      const after = yield* getPendingHomework;
      return after.map((item) => [
        item.payload.id === queued.payload.id,
        item.payload.content,
      ]);
    }),
  );
  expect(result).toEqual([[true, edit]]);
});
