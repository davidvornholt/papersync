import { Effect, Schema } from 'effect';

export class ActionRequestError extends Schema.TaggedError<ActionRequestError>()(
  'ActionRequestError',
  { message: Schema.String, cause: Schema.Defect() },
) {}
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
