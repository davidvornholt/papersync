import { Effect, Schema } from 'effect';
import { TaskEntry, WeekId } from '@/shared/types/schemas';
import type { ExtractedEntry } from './entry';
import { HomeworkError } from './error';
import { reconcileHomework } from './reconcile';

export type ReviewWeekResult =
  | { readonly success: true; readonly entries: ReadonlyArray<ExtractedEntry> }
  | { readonly success: false; readonly error: string };

const ReviewWeek = Schema.Struct({
  weekId: WeekId,
  entries: Schema.Array(
    TaskEntry.pipe(Schema.extend(Schema.Struct({ id: Schema.String }))),
  ),
});

export const reconcileReviewWeek = (
  entries: ReadonlyArray<ExtractedEntry>,
  weekId: string,
) =>
  Effect.gen(function* () {
    const input = yield* Schema.decodeUnknown(ReviewWeek)({ entries, weekId });
    const result = yield* reconcileHomework({
      weekId: input.weekId,
      confidence: 1,
      entries: input.entries.map((entry) => ({
        ...entry,
        action: 'add' as const,
      })),
    });
    // Recheck duplicate status while preserving review IDs, wording, and dates.
    return input.entries.map(
      (entry, index): ExtractedEntry => ({
        ...entry,
        action: result.entries[index].action,
      }),
    );
  }).pipe(
    Effect.mapError(
      (cause) =>
        new HomeworkError({
          message:
            'Could not apply the week. Check the week and entry dates, then try again. Your review is still here.',
          cause,
        }),
    ),
  );
