import {
  PendingHomework,
  type QueuedHomework,
} from '@papersync/homework/contract';
import { getTaskMarker } from '@papersync/homework/identity';
import { Effect, Schema } from 'effect';
import type { PluginApi, Task } from './api';
import { ImportError } from './error';
export const serviceUrl = 'https://papersync.vornholt.online/api/homework';
export const secretKey = 'papersync-connection';
const lineBreakPattern = /\r?\n/u;
const call = <T>(run: () => Promise<T>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new ImportError({
        message:
          'Could not import homework. Check the connection key and try again.',
        cause,
      }),
  });
const hasMarker = (task: Task, id: string) =>
  task.notes?.split(lineBreakPattern).includes(getTaskMarker(id)) ?? false;
const importEntry = (
  api: PluginApi,
  item: QueuedHomework,
  tasks: Array<Task>,
  archived: ReadonlyArray<Task>,
) =>
  Effect.gen(function* () {
    const { payload } = item;
    const existing = tasks.find((task) => hasMarker(task, payload.id));
    const archivedTask = archived.find((task) => hasMarker(task, payload.id));
    if (archivedTask) {
      return archivedTask.id;
    }
    if (existing) {
      yield* call(() =>
        api.updateTask(existing.id, {
          isDone: existing.isDone === true || payload.isCompleted,
          dueDay: payload.dueDate ?? null,
        }),
      );
      return existing.id;
    }
    const notes = [
      getTaskMarker(payload.id),
      `Week: ${payload.week}`,
      `Written on: ${payload.day}`,
      `Subject: ${payload.subject}`,
    ].join('\n');
    const id = yield* call(() =>
      api.addTask({
        title: payload.content,
        notes,
        isDone: payload.isCompleted,
        ...(payload.dueDate ? { dueDay: payload.dueDate } : {}),
        ...(payload.projectId ? { projectId: payload.projectId } : {}),
        ...(payload.tagIds ? { tagIds: [...payload.tagIds] } : {}),
      }),
    );
    tasks.push({ id, notes, isDone: payload.isCompleted });
    return id;
  });
export const importHomework = (api: PluginApi) =>
  Effect.gen(function* () {
    const token = yield* call(() => api.getSecret(secretKey));
    if (!token) {
      return 0;
    }
    const headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    };
    const response = yield* call(() => api.request(serviceUrl, { headers }));
    const items = yield* Schema.decodeUnknown(PendingHomework)(response).pipe(
      Effect.mapError(
        (cause) =>
          new ImportError({
            message:
              'PaperSync returned an invalid queue. No tasks were imported.',
            cause,
          }),
      ),
    );
    if (items.length === 0) {
      return 0;
    }
    const tasks = [...(yield* call(() => api.getTasks()))];
    const archived = yield* call(() => api.getArchivedTasks());
    yield* Effect.forEach(
      items,
      (item) =>
        Effect.gen(function* () {
          const taskId = yield* importEntry(api, item, tasks, archived);
          yield* call(() =>
            api.request(serviceUrl, {
              method: 'POST',
              headers,
              body: { id: item.payload.id, revision: item.revision, taskId },
            }),
          );
        }),
      { concurrency: 1, discard: true },
    );
    return items.length;
  });
