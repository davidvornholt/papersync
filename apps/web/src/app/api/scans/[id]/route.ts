import { Duration, Effect, Exit } from 'effect';
import {
  cancelScanJob,
  getScanJob,
} from '@/features/scanner/services/scan-jobs';
import { rejectUnauthorizedApiRequest } from '@/shared/auth/session';

const notFoundStatus = 404;
const clientClosedStatus = 499;
const noContentStatus = 204;
// Long polling answers as soon as analysis finishes, with one request in
// flight while the browser waits. Stay below common proxy idle timeouts.
const longPollSeconds = 25;
const longPollTimeout = Duration.seconds(longPollSeconds);
const noStore = { 'Cache-Control': 'no-store' };
type ScanRouteContext = { readonly params: Promise<{ readonly id: string }> };

export const GET = async (
  request: Request,
  context: ScanRouteContext,
): Promise<Response> => {
  const rejection = await rejectUnauthorizedApiRequest(request);
  if (rejection) {
    return rejection;
  }
  const { id } = await context.params;
  const waitFor = new URL(request.url).searchParams.has('wait')
    ? longPollTimeout
    : Duration.zero;
  const exit = await Effect.runPromiseExit(
    getScanJob(id, waitFor).pipe(
      Effect.match({
        onFailure: (error) =>
          Response.json(
            { error: error.message },
            { status: notFoundStatus, headers: noStore },
          ),
        onSuccess: (state) => Response.json(state, { headers: noStore }),
      }),
    ),
    { signal: request.signal },
  );
  // Only an aborted request interrupts the wait; nobody reads this response.
  return Exit.isSuccess(exit)
    ? exit.value
    : new Response(null, { status: clientClosedStatus });
};

export const DELETE = async (
  request: Request,
  context: ScanRouteContext,
): Promise<Response> => {
  const rejection = await rejectUnauthorizedApiRequest(request);
  if (rejection) {
    return rejection;
  }
  const { id } = await context.params;
  await Effect.runPromise(cancelScanJob(id));
  return new Response(null, { status: noContentStatus });
};
