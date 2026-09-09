import { Data, Effect } from 'effect';

export class ActionRequestError extends Data.TaggedError('ActionRequestError')<{
  readonly message: string;
  readonly cause: unknown;
}> {}
export const requestAction = <A>(request: () => Promise<A>) =>
  Effect.tryPromise({
    try: request,
    catch: (cause) =>
      new ActionRequestError({
        message:
          'PaperSync could not complete the request. Check your connection and sign-in, then retry.',
        cause,
      }),
  });
