import {
  correctionsProtocol,
  type Homework,
  PendingHomework,
  pluginProtocolHeader,
  type QueuedHomework,
} from '@papersync/homework/contract';
import { getTaskMarker } from '@papersync/homework/identity';
import { Effect, Schema } from 'effect';
import type { PluginApi, Task } from './api';
import { ImportError } from './error';
import {
  chooseImportDestination,
  type ImportDestination,
} from './import-destination';
import { normalizeSubject } from './subject-tags';
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
const detailPrefixes = ['Week: ', 'Written on: ', 'Subject: '];
const paperSyncLines = (payload: Homework) => [
  getTaskMarker(payload.id),
  `Week: ${payload.week}`,
  `Written on: ${payload.day}`,
  `Subject: ${payload.subject}`,
];
// PaperSync owns its marker and the detail lines right after it, each at most
// once and in this order; anything else in the notes was written in Super
// Productivity and stays as it is, line breaks included.
const withPaperSyncLines = (notes: string, payload: Homework) => {
  const lines = notes.split(lineBreakPattern);
  const start = lines.indexOf(getTaskMarker(payload.id));
  const following = lines.slice(start + 1);
  const detailCount = detailPrefixes.reduce(
    (count, prefix) =>
      following[count]?.startsWith(prefix) ? count + 1 : count,
    0,
  );
  return [
    ...lines.slice(0, start),
    ...paperSyncLines(payload),
    ...following.slice(detailCount),
  ].join(notes.includes('\r\n') ? '\r\n' : '\n');
};
const importEntry = (
  api: PluginApi,
  item: QueuedHomework,
  {
    tasks,
    archived,
    destination,
  }: {
    readonly tasks: Array<Task>;
    readonly archived: ReadonlyArray<Task>;
    readonly destination: ImportDestination;
  },
) =>
  Effect.gen(function* () {
    const { payload } = item;
    const existing = tasks.find((task) => hasMarker(task, payload.id));
    const archivedTask = archived.find((task) => hasMarker(task, payload.id));
    if (archivedTask) {
      return archivedTask.id;
    }
    if (existing) {
      const notes = withPaperSyncLines(existing.notes ?? '', payload);
      yield* call(() =>
        api.updateTask(existing.id, {
          title: payload.content,
          dueDay: payload.dueDate ?? null,
          ...(notes === existing.notes ? {} : { notes }),
        }),
      );
      return existing.id;
    }
    const notes = paperSyncLines(payload).join('\n');
    const id = yield* call(() =>
      api.addTask({
        title: payload.content,
        notes,
        ...(payload.dueDate ? { dueDay: payload.dueDate } : {}),
        projectId: destination.projectId,
        tagIds: [
          ...(destination.subjectTagIds.get(
            normalizeSubject(payload.subject),
          ) ?? []),
        ],
      }),
    );
    tasks.push({ id, notes });
    return id;
  });
export const importHomework = (api: PluginApi) =>
  Effect.gen(function* () {
    const token = yield* call(() => api.getSecret(secretKey));
    if (!token) {
      return yield* Effect.fail(
        new ImportError({
          message:
            'Connect PaperSync in the plugin settings before importing homework.',
        }),
      );
    }
    const headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      [pluginProtocolHeader]: String(correctionsProtocol),
    };
    const response = yield* call(() => api.request(serviceUrl, { headers }));
    const items = yield* Schema.decodeUnknownEffect(PendingHomework)(
      response,
    ).pipe(
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
    const destination = yield* chooseImportDestination(
      api,
      items.map((item) => item.payload.subject),
    );
    if (!destination) {
      return null;
    }
    const tasks = [...(yield* call(() => api.getTasks()))];
    const archived = yield* call(() => api.getArchivedTasks());
    yield* Effect.forEach(
      items,
      (item) =>
        Effect.gen(function* () {
          const taskId = yield* importEntry(api, item, {
            tasks,
            archived,
            destination,
          });
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
