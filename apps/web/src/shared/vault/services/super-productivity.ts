import { Effect } from 'effect';
import {
  isSuperProductivityResponse,
  isSuperProductivityTask,
  isSuperProductivityTaskArray,
} from './super-productivity-response';
import {
  DEFAULT_SUPER_PRODUCTIVITY_ENDPOINT,
  SuperProductivityApiError,
  type SuperProductivityTask,
  type SuperProductivityTaskInput,
} from './super-productivity-types';

export type {
  SuperProductivityTask,
  SuperProductivityTaskInput,
} from './super-productivity-types';
export { SuperProductivityApiError } from './super-productivity-types';

const normalizeEndpoint = (endpoint?: string): string => {
  const trimmed = endpoint?.trim() || DEFAULT_SUPER_PRODUCTIVITY_ENDPOINT;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const makeUrl = (
  endpoint: string | undefined,
  path: string,
  query?: Record<string, string>,
): URL => {
  const url = new URL(`${normalizeEndpoint(endpoint)}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
};

const requestJson = (
  endpoint: string | undefined,
  path: string,
  init: RequestInit = {},
  query?: Record<string, string>,
): Effect.Effect<unknown, SuperProductivityApiError> =>
  Effect.tryPromise({
    try: async () => {
      const headers = new Headers(init.headers);
      headers.set('Accept', 'application/json');
      if (init.body) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(makeUrl(endpoint, path, query), {
        ...init,
        headers,
      });
      const body = (await response.json()) as unknown;

      if (!isSuperProductivityResponse(body)) {
        throw new SuperProductivityApiError({
          message: 'Invalid response from Super Productivity REST API',
          status: response.status,
        });
      }

      if (!response.ok || !body.ok) {
        const error = body.ok
          ? {
              code: 'HTTP_ERROR',
              message: `Super Productivity REST API returned HTTP ${response.status}`,
            }
          : body.error;
        throw new SuperProductivityApiError({
          message: error.message,
          status: response.status,
          code: error.code,
        });
      }

      return body.data;
    },
    catch: (error) => {
      if (error instanceof SuperProductivityApiError) {
        return error;
      }
      return new SuperProductivityApiError({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to call Super Productivity REST API',
        cause: error,
      });
    },
  });

export const checkSuperProductivityHealth = (
  endpoint?: string,
): Effect.Effect<void, SuperProductivityApiError> =>
  requestJson(endpoint, '/health').pipe(Effect.asVoid);

export const listSuperProductivityTasks = (
  endpoint: string | undefined,
  query: string,
): Effect.Effect<readonly SuperProductivityTask[], SuperProductivityApiError> =>
  requestJson(
    endpoint,
    '/tasks',
    {},
    {
      query,
      includeDone: 'true',
      source: 'all',
    },
  ).pipe(
    Effect.flatMap((data) => {
      if (isSuperProductivityTaskArray(data)) {
        return Effect.succeed(data);
      }
      return Effect.fail(
        new SuperProductivityApiError({
          message: 'Invalid tasks response from Super Productivity REST API',
        }),
      );
    }),
  );

export const createSuperProductivityTask = (
  endpoint: string | undefined,
  task: SuperProductivityTaskInput,
): Effect.Effect<SuperProductivityTask, SuperProductivityApiError> =>
  requestJson(endpoint, '/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }).pipe(
    Effect.flatMap((data) => {
      if (isSuperProductivityTask(data)) {
        return Effect.succeed(data);
      }
      return Effect.fail(
        new SuperProductivityApiError({
          message:
            'Invalid create task response from Super Productivity REST API',
        }),
      );
    }),
  );

export const updateSuperProductivityTask = (
  endpoint: string | undefined,
  taskId: string,
  updates: Partial<SuperProductivityTaskInput>,
): Effect.Effect<SuperProductivityTask, SuperProductivityApiError> =>
  requestJson(endpoint, `/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }).pipe(
    Effect.flatMap((data) => {
      if (isSuperProductivityTask(data)) {
        return Effect.succeed(data);
      }
      return Effect.fail(
        new SuperProductivityApiError({
          message:
            'Invalid update task response from Super Productivity REST API',
        }),
      );
    }),
  );
