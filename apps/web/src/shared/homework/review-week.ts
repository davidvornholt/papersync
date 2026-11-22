import { getReadingId } from '@papersync/homework/identity';
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
    // Recheck duplicate status while preserving review IDs, edits, and dates.
    // An entry still as the scan read it shows the saved homework it matches,
    // so approving it cannot overwrite a correction with the misreading. An
    // edit that differs from the matched homework is a correction of it.
    return yield* Effect.forEach(input.entries, (entry, index) =>
      Effect.gen(function* () {
        const reconciled: TaskEntry = result.entries[index];
        const { savedHomeworkIds } = reconciled;
        const wording = yield* getReadingId(
          entry.day,
          entry.subject,
          entry.content,
        );
        const asRead = entry.readingId === wording;
        const action =
          !asRead &&
          reconciled.action === 'skip' &&
          wording !==
            (yield* getReadingId(
              reconciled.day,
              reconciled.subject,
              reconciled.content,
            ))
            ? 'modify'
            : reconciled.action;
        const reviewed: ExtractedEntry = {
          ...entry,
          ...(asRead
            ? {
                day: reconciled.day,
                subject: reconciled.subject,
                content: reconciled.content,
              }
            : {}),
          action,
          ...(savedHomeworkIds === undefined ? {} : { savedHomeworkIds }),
        };
        return reviewed;
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
