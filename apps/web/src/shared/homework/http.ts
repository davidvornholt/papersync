import { databaseRuntime } from '@papersync/db/runtime';
import { Acknowledgement } from '@papersync/homework/contract';
import { Effect, Schema } from 'effect';
import { isConnectionAuthorized } from './connection';
import { HomeworkError } from './error';
import { acknowledgeHomework, getPendingHomework } from './queue';

const unauthorizedStatus = 401;
const invalidRequestStatus = 400;
const unavailableStatus = 503;
const noContentStatus = 204;
const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Authorization, Content-Type',
  'cache-control': 'no-store',
};
export const homeworkOptions = () =>
  new Response(null, { status: noContentStatus, headers });
export const handleHomeworkRequest = (request: Request): Promise<Response> => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return Promise.resolve(
      Response.json(
        { error: 'A plugin connection key is required.' },
        { status: unauthorizedStatus, headers },
      ),
    );
  }

  return databaseRuntime.runPromise(
    Effect.gen(function* () {
      if (
        !(yield* isConnectionAuthorized(authorization.slice('Bearer '.length)))
      ) {
        return Response.json(
          { error: 'The plugin connection key is invalid or was revoked.' },
          { status: unauthorizedStatus, headers },
        );
      }
      if (request.method === 'GET') {
        return Response.json(yield* getPendingHomework, { headers });
      }
      const acknowledgement = yield* Effect.tryPromise({
        try: () => request.json() as Promise<unknown>,
        catch: (cause) =>
          new HomeworkError({ message: 'Send a JSON acknowledgement.', cause }),
      }).pipe(
        Effect.flatMap(Schema.decodeUnknown(Acknowledgement)),
        Effect.either,
      );
      if (acknowledgement._tag === 'Left') {
        return Response.json(
          { error: 'Invalid acknowledgement.' },
          { status: invalidRequestStatus, headers },
        );
      }
      const { id, revision, taskId } = acknowledgement.right;
      yield* acknowledgeHomework(id, revision, taskId);
      return Response.json({ ok: true }, { headers });
    }).pipe(
      Effect.catchAll(() =>
        Effect.succeed(
          Response.json(
            { error: 'The homework queue is unavailable. Retry shortly.' },
            { status: unavailableStatus, headers },
          ),
        ),
      ),
    ),
  );
};
