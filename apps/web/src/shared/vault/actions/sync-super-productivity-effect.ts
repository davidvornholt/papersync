import { Effect } from 'effect';
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

const exactTitleMatch = (
  tasks: readonly SuperProductivityTask[],
  title: string,
): SuperProductivityTask | undefined =>
  tasks.find((task) => task.title.trim() === title.trim());

const createTaskNotes = (entry: ExtractedEntry, weekId: WeekId): string => {
  const lines = [
    `Synced from PaperSync (${weekId}).`,
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
    const existingTask = exactTitleMatch(existingTasks, title);

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

export const syncToSuperProductivityEffect = (
  entries: readonly ExtractedEntry[],
  options: SuperProductivitySyncOptions,
): Effect.Effect<
  SuperProductivitySyncSummary,
  SyncValidationError | SuperProductivityApiError
> =>
  Effect.gen(function* () {
    if (entries.length === 0) {
      return yield* Effect.fail(
        new SyncValidationError({ message: 'No entries to sync' }),
      );
    }

    const taskEntries = entries.filter(
      (entry) => entry.isTask && entry.content.trim().length > 0,
    );

    if (taskEntries.length === 0) {
      return yield* Effect.fail(
        new SyncValidationError({
          message: 'No task entries to sync to Super Productivity',
        }),
      );
    }

    yield* checkSuperProductivityHealth(options.endpoint);

    const results = yield* Effect.forEach(
      taskEntries,
      (entry) => syncEntry(entry, options),
      { concurrency: 1 },
    );

    return summarize(results, entries.length - taskEntries.length);
  });
