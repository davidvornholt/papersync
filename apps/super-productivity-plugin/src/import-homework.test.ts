import { expect, it, mock } from 'bun:test';
import { getTaskMarker } from '@papersync/homework/identity';
import { Effect } from 'effect';
import type { PluginApi, Task } from './api';
import { importHomework } from './import-homework';

const item = {
  payload: {
    id: 'homework-1',
    week: '2026-W37',
    day: 'Monday',
    subject: 'Math',
    content: 'Finish the worksheet',
    isCompleted: false,
    dueDate: '2026-09-10',
  },
  revision: 'revision-1',
};
const makeApi = () => {
  const tasks: Array<Task> = [];
  const api = {
    getTasks: mock(() => Promise.resolve(tasks)),
    getArchivedTasks: mock(() => Promise.resolve<ReadonlyArray<Task>>([])),
    addTask: mock((input) => {
      tasks.push({ id: 'task-1', ...input });
      return Promise.resolve('task-1');
    }),
    updateTask: mock(() => Promise.resolve()),
    getSecret: mock(() => Promise.resolve('local-test-key')),
    setSecret: mock(() => Promise.resolve()),
    request: mock((_url, options) =>
      Promise.resolve(options.method === 'POST' ? { ok: true } : [item]),
    ),
    showSnack: mock(() => undefined),
    registerHeaderButton: mock(() => undefined),
    registerConfigHandler: mock(() => undefined),
    openDialog: mock(() => Promise.resolve(undefined)),
  } satisfies PluginApi;
  return { api, tasks };
};

it('an interrupted acknowledgement retries without duplicating a task or reopening it', async () => {
  const { api, tasks } = makeApi();
  api.request
    .mockImplementationOnce(() => Promise.resolve([item]))
    .mockImplementationOnce(() => Promise.reject(new Error('offline')));
  const failed = await Effect.runPromise(
    importHomework(api).pipe(Effect.either),
  );
  expect(failed._tag).toBe('Left');
  tasks[0] = {
    id: 'task-1',
    notes: getTaskMarker(item.payload.id),
    isDone: true,
  };
  await Effect.runPromise(importHomework(api));
  expect(api.addTask).toHaveBeenCalledTimes(1);
  expect(api.addTask).toHaveBeenCalledWith(
    expect.objectContaining({ dueDay: '2026-09-10' }),
  );
  expect(api.updateTask).toHaveBeenCalledWith(
    'task-1',
    expect.objectContaining({ isDone: true }),
  );
  expect(api.request).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: { id: item.payload.id, revision: item.revision, taskId: 'task-1' },
    }),
  );
});

it('an archived task is acknowledged without recreating or editing it', async () => {
  const { api } = makeApi();
  api.getArchivedTasks.mockResolvedValue([
    { id: 'archived-1', notes: getTaskMarker(item.payload.id), isDone: true },
  ]);
  await Effect.runPromise(importHomework(api));
  expect(api.addTask).not.toHaveBeenCalled();
  expect(api.updateTask).not.toHaveBeenCalled();
});

it('invalid queue data cannot create tasks', async () => {
  const { api } = makeApi();
  api.request.mockResolvedValue([
    {
      payload: { ...item.payload, dueDate: '2026-02-30' },
      revision: item.revision,
    },
  ]);
  const result = await Effect.runPromise(
    importHomework(api).pipe(Effect.either),
  );
  expect(result._tag).toBe('Left');
  expect(api.addTask).not.toHaveBeenCalled();
});
