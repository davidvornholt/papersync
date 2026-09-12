import { afterAll, expect, it, mock } from 'bun:test';
import type { QueuedHomework } from '@papersync/homework/contract';
import { getTaskMarker } from '@papersync/homework/identity';
import { Effect } from 'effect';
import type { PluginApi, Task } from './api';
import { importHomework } from './import-homework';
import { createImportController } from './import-lifecycle';

const originalDocument = Object.getOwnPropertyDescriptor(
  globalThis,
  'document',
);
const originalSelect = Object.getOwnPropertyDescriptor(
  globalThis,
  'HTMLSelectElement',
);
class FixtureSelect {
  value = 'project-1';
}
Object.defineProperty(globalThis, 'HTMLSelectElement', {
  configurable: true,
  value: FixtureSelect,
});
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    querySelector: () => new FixtureSelect(),
    querySelectorAll: () => [{ value: 'tag-1' }],
  },
});
afterAll(() => {
  for (const [name, descriptor] of [
    ['document', originalDocument],
    ['HTMLSelectElement', originalSelect],
  ] as const) {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, name);
    }
  }
});

const item: QueuedHomework = {
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
    getAllProjects: mock(() =>
      Promise.resolve([
        { id: 'project-1', title: 'School <work>' },
        { id: 'old', title: 'Archived', isArchived: true },
      ]),
    ),
    getAllTags: mock(() =>
      Promise.resolve([{ id: 'tag-1', title: 'Homework' }]),
    ),
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
    openDialog: mock((options: Parameters<PluginApi['openDialog']>[0]) => {
      options.buttons
        .find((button) => button.label === 'Import homework')
        ?.onClick?.();
      return Promise.resolve<string | undefined>('Import homework');
    }),
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

it('removes a reviewed due date while preserving completed state', async () => {
  const { api, tasks } = makeApi();
  tasks.push({
    id: 'task-1',
    notes: getTaskMarker(item.payload.id),
    isDone: true,
    dueDay: '2026-09-10',
  });
  const { dueDate: _dueDate, ...payloadWithoutDueDate } = item.payload;
  api.request.mockResolvedValue([
    {
      payload: { ...payloadWithoutDueDate, isCompleted: false },
      revision: item.revision,
    },
  ]);

  await Effect.runPromise(importHomework(api));

  expect(api.updateTask).toHaveBeenCalledWith('task-1', {
    isDone: true,
    dueDay: null,
  });
  expect(api.addTask).not.toHaveBeenCalled();
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

it('unload interrupts overlapping manual imports', async () => {
  const controller = createImportController();
  let interrupted = 0;
  const runningImport = Effect.never.pipe(
    Effect.ensuring(
      Effect.sync(() => {
        interrupted += 1;
      }),
    ),
  );

  controller.start(runningImport);
  controller.start(runningImport);
  await Effect.runPromise(controller.stop());

  expect(interrupted).toBe(2);
});

it('selects projects and tags by name and escapes labels in the import dialog', async () => {
  const { api } = makeApi();
  await Effect.runPromise(importHomework(api));
  expect(api.openDialog.mock.calls[0]?.[0].htmlContent).toContain(
    'School &lt;work&gt;',
  );
  expect(api.openDialog.mock.calls[0]?.[0].htmlContent).not.toContain(
    'Archived',
  );
  expect(api.openDialog.mock.calls[0]?.[0].htmlContent).not.toContain(
    '<option value="">',
  );
  expect(api.addTask).toHaveBeenCalledWith(
    expect.objectContaining({ projectId: 'project-1', tagIds: ['tag-1'] }),
  );
});
it('cancelling leaves the queue unacknowledged and creates no tasks', async () => {
  const { api } = makeApi();
  api.openDialog.mockImplementation(() => Promise.resolve(undefined));
  expect(await Effect.runPromise(importHomework(api))).toBeNull();
  expect(api.addTask).not.toHaveBeenCalled();
  expect(api.request).toHaveBeenCalledTimes(1);
});
