import { Duration, Effect, Schedule, Schema } from 'effect';
import { OCRResponse, type WeekId } from '@/shared/types/schemas';
import {
  ScanJobMissingError,
  ScanJobRequestError,
} from '../errors/scan-client';
import type { AISettings } from './use-scan-types';

const ScanJobState = Schema.Union([
  Schema.Struct({ status: Schema.Literal('processing') }),
  Schema.Struct({
    status: Schema.Literal('complete'),
    analysis: Schema.Struct({ data: OCRResponse, modelUsed: Schema.String }),
  }),
  Schema.Struct({ status: Schema.Literal('failed'), error: Schema.String }),
]);
type ScanJobState = typeof ScanJobState.Type;
export type FinishedScanJob = Exclude<ScanJobState, { status: 'processing' }>;

const notFoundStatus = 404;
const connectionMessage =
  'PaperSync could not reach the server. Check your connection; the analysis continues on the server.';
const uploadMessage =
  'The photos were not uploaded. Check your connection, then analyze again.';

const send = (url: string, init?: RequestInit) =>
  Effect.tryPromise({
    try: (signal) => fetch(url, { ...init, signal }),
    catch: (cause) =>
      new ScanJobRequestError({ message: connectionMessage, cause }),
  });

const readError = (response: Response) =>
  Effect.tryPromise(() => response.json() as Promise<unknown>).pipe(
    Effect.flatMap(
      Schema.decodeUnknownEffect(Schema.Struct({ error: Schema.String })),
    ),
    Effect.map(({ error }) => error),
    Effect.orElseSucceed(
      () => `PaperSync returned HTTP ${response.status}. Retry the analysis.`,
    ),
    Effect.flatMap((message) =>
      Effect.fail(
        new ScanJobRequestError({ message, status: response.status }),
      ),
    ),
  );

/** Uploads the pages and returns the server-side job id. */
export const startScanJob = (
  pages: ReadonlyArray<Blob>,
  weekId: WeekId | null,
  ai: AISettings,
) =>
  Effect.gen(function* () {
    const form = new FormData();
    pages.forEach((page, index) => {
      form.append('page', page, `page-${index + 1}.${page.type.split('/')[1]}`);
    });
    if (weekId) {
      form.set('weekId', weekId);
    }
    form.set('provider', ai.provider);
    if (ai.googleApiKey) {
      form.set('googleApiKey', ai.googleApiKey);
    }
    if (ai.ollamaEndpoint) {
      form.set('ollamaEndpoint', ai.ollamaEndpoint);
    }
    const response = yield* send('/api/scans', {
      method: 'POST',
      body: form,
    }).pipe(
      Effect.mapError(
        (error) =>
          new ScanJobRequestError({ message: uploadMessage, cause: error }),
      ),
    );
    if (!response.ok) {
      return yield* readError(response);
    }
    const body = yield* Effect.tryPromise({
      try: () => response.json() as Promise<unknown>,
      catch: (cause) =>
        new ScanJobRequestError({ message: uploadMessage, cause }),
    });
    const { id } = yield* Schema.decodeUnknownEffect(
      Schema.Struct({ id: Schema.String }),
    )(body).pipe(
      Effect.mapError(
        (cause) =>
          new ScanJobRequestError({
            message:
              'PaperSync returned an unexpected reply. Retry the analysis.',
            cause,
          }),
      ),
    );
    return id;
  });

const readScanJob = (id: string) =>
  Effect.gen(function* () {
    const response = yield* send(`/api/scans/${encodeURIComponent(id)}?wait`, {
      cache: 'no-store',
    });
    if (response.status === notFoundStatus) {
      return yield* readError(response).pipe(
        Effect.mapError(
          (error) => new ScanJobMissingError({ message: error.message }),
        ),
      );
    }
    if (!response.ok) {
      return yield* readError(response);
    }
    const body = yield* Effect.tryPromise({
      try: () => response.json() as Promise<unknown>,
      catch: (cause) =>
        new ScanJobRequestError({ message: connectionMessage, cause }),
    });
    return yield* Schema.decodeUnknownEffect(ScanJobState)(body).pipe(
      Effect.mapError(
        (cause) =>
          new ScanJobRequestError({
            message:
              'PaperSync returned an unexpected reply. Retry the analysis.',
            cause,
          }),
      ),
    );
  });

// Connection drops are expected while the phone switches apps or networks,
// and the gateway answers 502–504 while PaperSync restarts. Keep asking until
// the server answers, without retrying a lost sign-in or a rejected request.
const longestReconnectSeconds = 5;
const reconnect = Schedule.min([
  Schedule.exponential(Duration.seconds(1)),
  Schedule.spaced(Duration.seconds(longestReconnectSeconds)),
]);
const badGatewayStatus = 502;
const gatewayTimeoutStatus = 504;
const isTransient = (error: ScanJobRequestError | ScanJobMissingError) =>
  error instanceof ScanJobRequestError &&
  (error.status === undefined ||
    (error.status >= badGatewayStatus && error.status <= gatewayTimeoutStatus));
const pollPauseMilliseconds = 500;
const pollPause = Duration.millis(pollPauseMilliseconds);

/** Long-polls the job until it finishes. */
export const awaitScanJob = (
  id: string,
): Effect.Effect<FinishedScanJob, ScanJobRequestError | ScanJobMissingError> =>
  readScanJob(id).pipe(
    Effect.retry({ schedule: reconnect, while: isTransient }),
    Effect.flatMap((state) =>
      state.status === 'processing'
        ? Effect.sleep(pollPause).pipe(
            Effect.andThen(Effect.suspend(() => awaitScanJob(id))),
          )
        : Effect.succeed(state),
    ),
  );

/** Asks the server to stop a job; the browser has already moved on. */
export const cancelScanJob = (id: string) =>
  send(`/api/scans/${encodeURIComponent(id)}`, { method: 'DELETE' }).pipe(
    Effect.ignore,
  );
