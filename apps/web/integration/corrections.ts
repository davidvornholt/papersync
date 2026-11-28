import { expect, it } from 'bun:test';
import { Effect, Schema } from 'effect';
import type { ExtractedEntry } from '../src/shared/homework/entry';
import {
  acknowledgeHomework,
  enqueueHomework,
  getImportableHomework,
  getPendingHomework,
} from '../src/shared/homework/queue';
import { reconcileHomework } from '../src/shared/homework/reconcile';
import { reconcileReviewWeek } from '../src/shared/homework/review-week';
import { OCRResponse } from '../src/shared/types/schemas';
import { entry, options, runIsolated } from './support';

it('correcting saved homework revises its queued task, and rescans match either wording', async () => {
  const correction = 'Corrected integration homework';
  const scan = (entries: ReadonlyArray<typeof entry>) =>
    Schema.decodeUnknownSync(OCRResponse)({
      weekId: options.weekId,
      confidence: 1,
      entries,
    });
  const result = await runIsolated(
    Effect.gen(function* () {
      yield* enqueueHomework([entry], options);
      const [original] = yield* getPendingHomework;
      const [saved] = (yield* reconcileHomework(scan([entry]))).entries;
      if (!(original && saved)) {
        return null;
      }
      yield* acknowledgeHomework(
        original.payload.id,
        original.revision,
        'imported-task',
      );
      // Review entry, correct the wording, and apply the week again.
      const corrected: ExtractedEntry = {
        ...saved,
        id: 'review-2',
        action: 'modify',
        content: correction,
      };
      const reviewed = yield* reconcileReviewWeek([corrected], options.weekId);
      // Switching to another week and back before saving keeps the link.
      const otherWeek = yield* reconcileReviewWeek(reviewed, '2026-W38');
      const backAgain = yield* reconcileReviewWeek(otherWeek, options.weekId);
      yield* enqueueHomework(backAgain, options);
      yield* enqueueHomework([{ ...entry, content: 'New homework' }], options);
      const forOldPlugin = yield* getImportableHomework(false);
      const pending = yield* getImportableHomework(true);
      const rescan = yield* reconcileHomework(
        scan([entry, { ...entry, content: correction }]),
      );
      return {
        original,
        saved,
        corrected,
        reviewed,
        forOldPlugin,
        pending,
        rescan,
        otherWeek,
        backAgain,
      };
    }),
  );
  if (!result) {
    throw new Error('The first save was not queued.');
  }
  const { id } = result.original.payload;
  expect(result.saved.savedHomeworkIds).toEqual([id]);
  expect(result.reviewed).toEqual([result.corrected]);
  expect(result.pending.map((item) => item.payload)).toContainEqual({
    ...result.original.payload,
    content: correction,
  });
  expect(result.pending).toHaveLength(2);
  // A plugin that cannot rename tasks must not consume the correction.
  expect(result.forOldPlugin.map((item) => item.payload.content)).toEqual([
    'New homework',
  ]);
  expect(
    result.rescan.entries.map((item) => [
      item.action,
      item.content,
      item.savedHomeworkIds,
    ]),
  ).toEqual([
    ['skip', correction, [id]],
    ['skip', correction, [id]],
  ]);
  // Nothing is saved in that week, so no saved date comes along.
  expect(result.otherWeek).toEqual([
    { ...result.corrected, action: 'add', savedDueDate: undefined },
  ]);
  expect(result.backAgain).toEqual([result.corrected]);
});

it('a reviewed correction stays with its saved homework when the week is applied again', async () => {
  const tuesday = { ...entry, id: 'review-tuesday', day: 'Tuesday' };
  const result = await runIsolated(
    Effect.gen(function* () {
      yield* enqueueHomework([entry, tuesday], options);
      const scan = Schema.decodeUnknownSync(OCRResponse)({
        weekId: options.weekId,
        confidence: 1,
        entries: [entry],
      });
      const [monday] = (yield* reconcileHomework(scan)).entries;
      if (!monday) {
        return null;
      }
      // Monday's entry moved to Tuesday, where the same wording is saved.
      const moved = yield* reconcileReviewWeek(
        [{ ...monday, id: 'review-1', action: 'modify', day: 'Tuesday' }],
        options.weekId,
      );
      yield* enqueueHomework(
        [
          {
            ...monday,
            id: 'review-1',
            action: 'modify',
            content: 'Exercise 4',
          },
        ],
        options,
      );
      // Reverting the correction to the first wording is still a change.
      const reverted = yield* reconcileReviewWeek(
        [{ ...monday, id: 'review-1', action: 'modify' }],
        options.weekId,
      );
      return { ids: monday.savedHomeworkIds, moved, reverted };
    }),
  );
  expect(result?.ids).toHaveLength(1);
  expect(
    result?.moved.map((item) => [item.action, item.savedHomeworkIds]),
  ).toEqual([['modify', result?.ids]]);
  expect(
    result?.reverted.map((item) => [item.action, item.savedHomeworkIds]),
  ).toEqual([['modify', result?.ids]]);
});

it('a correction stays linked to each week it matches when the week changes and returns', async () => {
  const correction = 'Corrected integration homework';
  const nextWeek = { weekId: '2026-W38' };
  const result = await runIsolated(
    Effect.gen(function* () {
      yield* enqueueHomework([entry], options);
      yield* enqueueHomework([{ ...entry, content: correction }], nextWeek);
      const [saved] = (yield* reconcileHomework(
        Schema.decodeUnknownSync(OCRResponse)({
          weekId: options.weekId,
          confidence: 1,
          entries: [entry],
        }),
      )).entries;
      if (!saved) {
        return null;
      }
      const reviewed = yield* reconcileReviewWeek(
        [{ ...saved, id: 'review-2', action: 'modify', content: correction }],
        options.weekId,
      );
      // The next week already holds the corrected wording.
      const inNextWeek = yield* reconcileReviewWeek(reviewed, nextWeek.weekId);
      const backAgain = yield* reconcileReviewWeek(inNextWeek, options.weekId);
      const before = yield* getPendingHomework;
      yield* enqueueHomework(backAgain, options);
      // Correcting it inside the next week revises that week's homework.
      yield* enqueueHomework(
        inNextWeek.map((item) => ({ ...item, content: 'Exercise 5' })),
        nextWeek,
      );
      return {
        before,
        inNextWeek,
        backAgain,
        after: yield* getPendingHomework,
      };
    }),
  );
  if (!result) {
    throw new Error('The first save was not queued.');
  }
  const ids = (week: string) =>
    result.before
      .filter((item) => item.payload.week === week)
      .map((item) => item.payload.id);
  expect(result.inNextWeek.map((item) => item.action)).toEqual(['skip']);
  expect(result.backAgain.map((item) => item.action)).toEqual(['modify']);
  expect(
    result.after.map((item) => [
      item.payload.week,
      item.payload.id,
      item.payload.content,
    ]),
  ).toEqual(
    expect.arrayContaining([
      [options.weekId, ...ids(options.weekId), correction],
      [nextWeek.weekId, ...ids(nextWeek.weekId), 'Exercise 5'],
    ]),
  );
  expect(result.after).toHaveLength(2);
});
