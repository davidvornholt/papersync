import { Data, Effect } from 'effect';
import type { WeekId } from '@/shared/types/schemas';
import {
  checkSuperProductivityHealth,
  createSuperProductivityTask,
  listSuperProductivityTasks,
  type SuperProductivityApiError,
  type SuperProductivityTask,
  type SuperProductivityTaskInput,
  updateSuperProductivityTask,
} from '../services/super-productivity';
import type { ExtractedEntry } from './sync-helpers';
import { SyncValidationError } from './sync-types';

export type SuperProductivitySyncOptions = {
  readonly endpoint?: string;
  readonly projectId?: string;
  readonly tagIds?: readonly string[];
  readonly weekId: WeekId;
};

type SuperProductivitySyncSummary = {
  readonly created: number;
  readonly updated: number;
  readonly skipped: number;
  readonly taskIds: readonly string[];
};

type SuperProductivitySyncFailure = {
  readonly title: string;
  readonly message: string;
};

export class SuperProductivitySyncBatchError extends Data.TaggedError(
  'SuperProductivitySyncBatchError',
)<{
  readonly message: string;
  readonly failures: readonly SuperProductivitySyncFailure[];
  readonly summary: SuperProductivitySyncSummary;
}> {}

type SuperProductivityEntrySyncOutcome =
  | {
      readonly outcome: 'succeeded';
      readonly result: {
        readonly status: 'created' | 'updated';
        readonly taskId: string;
      };
    }
  | {
      readonly outcome: 'failed';
      readonly failure: SuperProductivitySyncFailure;
    };

const normalizeKeyPart = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

const createPaperSyncKey = (entry: ExtractedEntry, weekId: WeekId): string =>
  [weekId, entry.day, entry.subject, entry.content]
    .map(normalizeKeyPart)
    .join(' | ');

const createSourceLine = (weekId: WeekId): string =>
  `Synced from PaperSync (${weekId}).`;

const createPaperSyncKeyLine = (
  entry: ExtractedEntry,
  weekId: WeekId,
): string => `PaperSync key: ${createPaperSyncKey(entry, weekId)}`;

const notesHaveLine = (notes: string | undefined, expected: string): boolean =>
  notes?.split(/\r?\n/).some((line) => line.trim() === expected) ?? false;

const isMatchingPaperSyncTask = (
  task: SuperProductivityTask,
  entry: ExtractedEntry,
  weekId: WeekId,
): boolean => {
  const title = entry.content.trim();
  if (task.title.trim() !== title) {
    return false;
  }

  if (notesHaveLine(task.notes, createPaperSyncKeyLine(entry, weekId))) {
    return true;
  }

  return (
    notesHaveLine(task.notes, createSourceLine(weekId)) &&
    notesHaveLine(task.notes, `Planner day: ${entry.day}`) &&
    (!entry.subject || notesHaveLine(task.notes, `Subject: ${entry.subject}`))
  );
};

const findMatchingPaperSyncTask = (
  tasks: readonly SuperProductivityTask[],
  entry: ExtractedEntry,
  weekId: WeekId,
): SuperProductivityTask | undefined =>
  tasks.find((task) => isMatchingPaperSyncTask(task, entry, weekId));

const createTaskNotes = (entry: ExtractedEntry, weekId: WeekId): string => {
  const lines = [
    createSourceLine(weekId),
    createPaperSyncKeyLine(entry, weekId),
    `Planner day: ${entry.day}`,
  ];

  if (entry.subject) {
    lines.push(`Subject: ${entry.subject}`);
  }

  return lines.join('\n');
};

const entryToTaskInput = (
  entry: ExtractedEntry,
  options: SuperProductivitySyncOptions,
): SuperProductivityTaskInput => ({
  title: entry.content.trim(),
  notes: createTaskNotes(entry, options.weekId),
  isDone: entry.isCompleted,
  ...(entry.dueDate ? { dueDay: entry.dueDate } : {}),
  ...(options.projectId ? { projectId: options.projectId } : {}),
  ...(options.tagIds?.length ? { tagIds: options.tagIds } : {}),
});

const updateExistingTask = (
  entry: ExtractedEntry,
  existingTask: SuperProductivityTask,
  options: SuperProductivitySyncOptions,
): Effect.Effect<string, SuperProductivityApiError> =>
  updateSuperProductivityTask(options.endpoint, existingTask.id, {
    notes: createTaskNotes(entry, options.weekId),
    isDone: entry.isCompleted || existingTask.isDone === true,
    ...(entry.dueDate ? { dueDay: entry.dueDate } : {}),
  }).pipe(Effect.map((task) => task.id));

const syncEntry = (
  entry: ExtractedEntry,
  options: SuperProductivitySyncOptions,
): Effect.Effect<
  { readonly status: 'created' | 'updated'; readonly taskId: string },
  SuperProductivityApiError
> =>
  Effect.gen(function* () {
    const title = entry.content.trim();
    const existingTasks = yield* listSuperProductivityTasks(
      options.endpoint,
      title,
    );
    const existingTask = findMatchingPaperSyncTask(
      existingTasks,
      entry,
      options.weekId,
    );

    if (existingTask) {
      const taskId = yield* updateExistingTask(entry, existingTask, options);
      return { status: 'updated' as const, taskId };
    }

    const task = yield* createSuperProductivityTask(
      options.endpoint,
      entryToTaskInput(entry, options),
    );
    return { status: 'created' as const, taskId: task.id };
  });

const summarize = (
  results: readonly {
    readonly status: 'created' | 'updated';
    readonly taskId: string;
  }[],
  skipped: number,
): SuperProductivitySyncSummary => ({
  created: results.filter((result) => result.status === 'created').length,
  updated: results.filter((result) => result.status === 'updated').length,
  skipped,
  taskIds: results.map((result) => result.taskId),
});

const buildBatchErrorMessage = (
  synced: number,
  total: number,
  failures: readonly SuperProductivitySyncFailure[],
): string => {
  const failureDetails = failures
    .slice(0, 3)
    .map((failure) => `${failure.title}: ${failure.message}`)
    .join('; ');
  const remaining = failures.length > 3 ? `; +${failures.length - 3} more` : '';
  return `Synced ${synced} of ${total} Super Productivity tasks. Failed ${failures.length}: ${failureDetails}${remaining}`;
};

const dedupeTaskEntries = (
  entries: readonly ExtractedEntry[],
  weekId: WeekId,
): readonly ExtractedEntry[] => {
  const seen = new Set<string>();
  const uniqueEntries: ExtractedEntry[] = [];

  for (const entry of entries) {
    const key = createPaperSyncKey(entry, weekId);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEntries.push(entry);
    }
  }

  return uniqueEntries;
};

export const syncToSuperProductivityEffect = (
  entries: readonly ExtractedEntry[],
  options: SuperProductivitySyncOptions,
): Effect.Effect<
  SuperProductivitySyncSummary,
  | SyncValidationError
  | SuperProductivityApiError
  | SuperProductivitySyncBatchError
> =>
  Effect.gen(function* () {
    if (entries.length === 0) {
      return yield* Effect.fail(
        new SyncValidationError({ message: 'No entries to sync' }),
      );
    }

    const taskEntries = dedupeTaskEntries(
      entries.filter(
        (entry) => entry.isTask && entry.content.trim().length > 0,
      ),
      options.weekId,
    );

    if (taskEntries.length === 0) {
      return yield* Effect.fail(
        new SyncValidationError({
          message: 'No task entries to sync to Super Productivity',
        }),
      );
    }

    yield* checkSuperProductivityHealth(options.endpoint);

    const outcomes = yield* Effect.forEach(
      taskEntries,
      (entry) =>
        syncEntry(entry, options).pipe(
          Effect.match({
            onFailure: (error): SuperProductivityEntrySyncOutcome => ({
              outcome: 'failed',
              failure: {
                title: entry.content.trim(),
                message: error.message,
              },
            }),
            onSuccess: (result): SuperProductivityEntrySyncOutcome => ({
              outcome: 'succeeded',
              result,
            }),
          }),
        ),
      { concurrency: 1 },
    );

    const results = outcomes.flatMap((outcome) =>
      outcome.outcome === 'succeeded' ? [outcome.result] : [],
    );
    const failures = outcomes.flatMap((outcome) =>
      outcome.outcome === 'failed' ? [outcome.failure] : [],
    );
    const summary = summarize(results, entries.length - taskEntries.length);

    if (failures.length > 0) {
      return yield* Effect.fail(
        new SuperProductivitySyncBatchError({
          message: buildBatchErrorMessage(
            results.length,
            taskEntries.length,
            failures,
          ),
          failures,
          summary,
        }),
      );
    }

    return summary;
  });
