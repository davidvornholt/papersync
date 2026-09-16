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
let selectedSubjects = ['0'];
class FixtureSelect {
  readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
}
Object.defineProperty(globalThis, 'HTMLSelectElement', {
  configurable: true,
  value: FixtureSelect,
});
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    querySelector: (selector: string) =>
      new FixtureSelect(
        selector.endsWith('-project')
          ? 'project-1'
          : (selectedSubjects[Number(selector.split('-').at(-1))] ?? ''),
      ),
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
    dueDate: '2026-09-10',
  },
  revision: 'revision-1',
};
const makeApi = () => {
  selectedSubjects = ['0'];
  const tasks: Array<Task> = [];
  const api = {
    getAllProjects: mock(() =>
      Promise.resolve([
        { id: 'project-1', title: 'School <work>' },
        { id: 'old', title: 'Archived', isArchived: true },
      ]),
    ),
    getAllTags: mock(() => Promise.resolve([{ id: 'tag-1', title: 'Math' }])),
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
  tasks[0] = { id: 'task-1', notes: getTaskMarker(item.payload.id) };
  await Effect.runPromise(importHomework(api));
  expect(api.addTask).toHaveBeenCalledTimes(1);
  expect(api.addTask).toHaveBeenCalledWith(
    expect.objectContaining({ dueDay: '2026-09-10' }),
  );
  expect(api.updateTask).toHaveBeenCalledWith('task-1', {
    dueDay: '2026-09-10',
  });
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
    { id: 'archived-1', notes: getTaskMarker(item.payload.id) },
  ]);
  await Effect.runPromise(importHomework(api));
  expect(api.addTask).not.toHaveBeenCalled();
  expect(api.updateTask).not.toHaveBeenCalled();
});

it('removes a reviewed due date without touching completion', async () => {
  const { api, tasks } = makeApi();
  tasks.push({
    id: 'task-1',
    notes: getTaskMarker(item.payload.id),
    dueDay: '2026-09-10',
  });
  const { dueDate: _dueDate, ...payloadWithoutDueDate } = item.payload;
  api.request.mockResolvedValue([
    { payload: payloadWithoutDueDate, revision: item.revision },
  ]);

  await Effect.runPromise(importHomework(api));

  expect(api.updateTask).toHaveBeenCalledWith('task-1', { dueDay: null });
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

it('assigns each task its own subject tag and reuses the choice for repeated subjects', async () => {
  const { api } = makeApi();
  api.getAllTags.mockResolvedValue([
    { id: 'math', title: 'Math' },
    { id: 'english', title: 'English' },
  ]);
  selectedSubjects = ['0', '1'];
  api.request.mockImplementation((_url, options) =>
    Promise.resolve(
      options.method === 'POST'
        ? { ok: true }
        : [
            item,
            {
              ...item,
              payload: {
                ...item.payload,
                id: 'homework-2',
                subject: 'English',
              },
            },
            {
              ...item,
              payload: { ...item.payload, id: 'homework-3', subject: ' MATH ' },
            },
          ],
    ),
  );
  const expectedTaskCount = 3;
  expect(await Effect.runPromise(importHomework(api))).toBe(expectedTaskCount);
  expect(api.addTask.mock.calls.map(([input]) => input.tagIds)).toEqual([
    ['math'],
    ['english'],
    ['math'],
  ]);
});

it('leaves every task queued when a subject has no selected tag', async () => {
  const { api } = makeApi();
  selectedSubjects = [''];
  expect(await Effect.runPromise(importHomework(api))).toBeNull();
  expect(api.addTask).not.toHaveBeenCalled();
  expect(api.request).toHaveBeenCalledTimes(1);
  expect(api.showSnack).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'ERROR' }),
  );
});

it('imports without tags only after an explicit no-tag choice', async () => {
  const { api } = makeApi();
  api.getAllTags.mockResolvedValue([]);
  selectedSubjects = ['none'];
  await Effect.runPromise(importHomework(api));
  expect(api.addTask).toHaveBeenCalledWith(
    expect.objectContaining({ tagIds: [] }),
  );
});
