import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import type { WeekId } from '@/shared/types/schemas';
import type { ExtractedEntry } from '../sync-helpers';
import { syncToSuperProductivityEffect } from '../sync-super-productivity-effect';

type FetchCall = {
  readonly url: string;
  readonly method: string;
  readonly body?: unknown;
};

const originalFetch = globalThis.fetch;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const createEntry = (
  overrides: Partial<ExtractedEntry> = {},
): ExtractedEntry => ({
  id: 'entry-1',
  day: 'Monday',
  subject: 'Math',
  content: 'Finish worksheet',
  isTask: true,
  isCompleted: false,
  isNew: true,
  ...overrides,
});

const installFetchMock = (
  handler: (call: FetchCall) => Response,
): FetchCall[] => {
  const calls: FetchCall[] = [];

  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const body =
      typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const call = {
      url: input.toString(),
      method: init?.method ?? 'GET',
      body,
    };
    calls.push(call);
    return Promise.resolve(handler(call));
  }) as typeof fetch;

  return calls;
};

describe('syncToSuperProductivityEffect', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('creates Super Productivity tasks for new PaperSync task entries', async () => {
    const calls = installFetchMock((call) => {
      const url = new URL(call.url);
      if (url.pathname === '/health') {
        return jsonResponse({ ok: true, data: { server: 'up' } });
      }
      if (url.pathname === '/tasks' && call.method === 'GET') {
        expect(url.searchParams.get('query')).toBe('Finish worksheet');
        expect(url.searchParams.get('includeDone')).toBe('true');
        expect(url.searchParams.get('source')).toBe('all');
        return jsonResponse({ ok: true, data: [] });
      }
      if (url.pathname === '/tasks' && call.method === 'POST') {
        return jsonResponse({
          ok: true,
          data: { id: 'task-1', title: 'Finish worksheet' },
        });
      }
      return jsonResponse(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } },
        404,
      );
    });

    const summary = await Effect.runPromise(
      syncToSuperProductivityEffect([createEntry({ dueDate: '2026-02-02' })], {
        endpoint: 'http://127.0.0.1:3876',
        projectId: 'project-1',
        tagIds: ['tag-1'],
        weekId: '2026-W05' as WeekId,
      }),
    );

    expect(summary).toEqual({
      created: 1,
      updated: 0,
      skipped: 0,
      taskIds: ['task-1'],
    });
    expect(
      calls.map((call) => `${call.method} ${new URL(call.url).pathname}`),
    ).toEqual(['GET /health', 'GET /tasks', 'POST /tasks']);
    expect(calls[2]?.body).toEqual({
      title: 'Finish worksheet',
      notes:
        'Synced from PaperSync (2026-W05).\nPlanner day: Monday\nSubject: Math',
      isDone: false,
      dueDay: '2026-02-02',
      projectId: 'project-1',
      tagIds: ['tag-1'],
    });
  });

  it('updates an existing exact-title task instead of creating a duplicate', async () => {
    const calls = installFetchMock((call) => {
      const url = new URL(call.url);
      if (url.pathname === '/health') {
        return jsonResponse({ ok: true, data: { server: 'up' } });
      }
      if (url.pathname === '/tasks' && call.method === 'GET') {
        return jsonResponse({
          ok: true,
          data: [{ id: 'task-1', title: 'Finish worksheet', isDone: false }],
        });
      }
      if (url.pathname === '/tasks/task-1' && call.method === 'PATCH') {
        return jsonResponse({
          ok: true,
          data: { id: 'task-1', title: 'Finish worksheet', isDone: true },
        });
      }
      return jsonResponse(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } },
        404,
      );
    });

    const summary = await Effect.runPromise(
      syncToSuperProductivityEffect([createEntry({ isCompleted: true })], {
        weekId: '2026-W05' as WeekId,
      }),
    );

    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(1);
    expect(summary.taskIds).toEqual(['task-1']);
    expect(
      calls.map((call) => `${call.method} ${new URL(call.url).pathname}`),
    ).toEqual(['GET /health', 'GET /tasks', 'PATCH /tasks/task-1']);
    expect(calls[2]?.body).toEqual({
      notes:
        'Synced from PaperSync (2026-W05).\nPlanner day: Monday\nSubject: Math',
      isDone: true,
    });
  });

  it('fails before calling the REST API when there are no task entries', async () => {
    const calls = installFetchMock(() =>
      jsonResponse({ ok: true, data: { server: 'up' } }),
    );

    const error = await Effect.runPromise(
      syncToSuperProductivityEffect([createEntry({ isTask: false })], {
        weekId: '2026-W05' as WeekId,
      }).pipe(Effect.flip),
    );

    expect(error.message).toBe('No task entries to sync to Super Productivity');
    expect(calls).toEqual([]);
  });
});
