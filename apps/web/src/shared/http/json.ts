import { Data, Effect } from 'effect';

export class HttpError extends Data.TaggedError('HttpError')<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}
export const fetchJson = (
  url: string,
  options?: RequestInit,
): Effect.Effect<unknown, HttpError> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) => fetch(url, { ...options, signal }),
      catch: (cause) =>
        new HttpError({
          message:
            'Could not reach the service. Check the connection and try again.',
          cause,
        }),
    });
    if (!response.ok) {
      return yield* Effect.fail(
        new HttpError({
          message: `The service returned HTTP ${response.status}. Check the credentials and request.`,
          status: response.status,
        }),
      );
    }
    return yield* Effect.tryPromise({
      try: () => response.json() as Promise<unknown>,
      catch: (cause) =>
        new HttpError({ message: 'The service returned invalid JSON.', cause }),
    });
  });
