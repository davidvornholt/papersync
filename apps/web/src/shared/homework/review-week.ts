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
    Schema.Struct({ ...TaskEntry.fields, id: Schema.String }),
  ),
});

export const reconcileReviewWeek = (
  entries: ReadonlyArray<ExtractedEntry>,
  weekId: string,
) =>
  Effect.gen(function* () {
    const input = yield* Schema.decodeUnknownEffect(ReviewWeek)({
      entries,
      weekId,
    });
    const result = yield* reconcileHomework({
      weekId: input.weekId,
      confidence: 1,
      entries: input.entries.map((entry) => ({
        ...entry,
        action: 'add' as const,
      })),
    });
    // Recheck duplicate status while preserving review IDs, wording, and dates.
    return input.entries.map((entry, index): ExtractedEntry => {
      const { action, savedHomeworkId: match }: TaskEntry =
        result.entries[index];
      const { savedHomeworkId: previous, ...edited } = entry;
      // Keep a link into another week, so returning to it still corrects that
      // homework. Saving uses a link only within the week it belongs to.
      const savedHomeworkId = match ?? previous;
      return savedHomeworkId === undefined
        ? { ...edited, action }
        : { ...edited, action, savedHomeworkId };
    });
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
