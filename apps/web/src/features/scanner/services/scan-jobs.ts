import { Cause, Deferred, Duration, Effect, Fiber, Option } from 'effect';
import { ScanJobNotFoundError, ScanRequestError } from '../errors/scan-jobs';
import type { ScanAnalysis } from './scan-analysis';

export type FinishedScanJob =
  | { readonly status: 'complete'; readonly analysis: ScanAnalysis }
  | { readonly status: 'failed'; readonly error: string };
export type ScanJobState = { readonly status: 'processing' } | FinishedScanJob;

type ScanJob = {
  readonly startedAt: number;
  readonly outcome: Deferred.Deferred<FinishedScanJob>;
  readonly fiber: Fiber.Fiber<boolean>;
};

// Analysis runs on the server, so the browser can be backgrounded, frozen, or
// reloaded meanwhile. Photos stay in memory only while analysis runs; results
// stay until they expire, PaperSync restarts, or the browser cancels the job.
const jobRetentionHours = 6;
const jobRetention = Duration.hours(jobRetentionHours);
const jobCapacity = 20;
const runningJobLimit = 2;
const tooManyRequestsStatus = 429;
const unexpectedFailure =
  'Analysis stopped unexpectedly. Analyze the photos again.';

// Route handlers may be bundled separately; one store per server process
// keeps a job visible to every route.
const storeKey = Symbol.for('papersync.scanJobs');
type ScanJobScope = typeof globalThis & {
  [storeKey]?: Map<string, ScanJob>;
};
const getJobs = (): Map<string, ScanJob> => {
  const scope = globalThis as ScanJobScope;
  const existing = scope[storeKey];
  if (existing) {
    return existing;
  }
  const created = new Map<string, ScanJob>();
  scope[storeKey] = created;
  return created;
};

const removeJob = (id: string) =>
  Effect.suspend(() => {
    const jobs = getJobs();
    const job = jobs.get(id);
    jobs.delete(id);
    return job
      ? Effect.asVoid(Effect.forkDetach(Fiber.interrupt(job.fiber)))
      : Effect.void;
  });

const removeExpiredJobs = Effect.suspend(() => {
  const jobs = getJobs();
  const expiredBefore = Date.now() - Duration.toMillis(jobRetention);
  const expired = [...jobs.entries()]
    .filter(([, job]) => job.startedAt < expiredBefore)
    .map(([id]) => id);
  return Effect.forEach(expired, removeJob, { discard: true });
});

// Map iteration follows insertion order, so the oldest jobs go first.
const makeRoomForJob = Effect.suspend(() => {
  const ids = [...getJobs().keys()];
  return Effect.forEach(
    ids.slice(0, Math.max(0, ids.length - jobCapacity + 1)),
    removeJob,
    { discard: true },
  );
});

const isRunning = (job: ScanJob) =>
  Deferred.isDone(job.outcome).pipe(Effect.map((done) => !done));

/** Fails while the server is busy, before an upload is read into memory. */
export const ensureScanCapacity = Effect.gen(function* () {
  yield* removeExpiredJobs;
  const running = yield* Effect.filter([...getJobs().values()], isRunning);
  if (running.length >= runningJobLimit) {
    return yield* new ScanRequestError({
      message:
        'Other photos are still being analyzed. Wait for them, then try again.',
      status: tooManyRequestsStatus,
    });
  }
});

/** Starts analysis in a fiber that outlives the request and returns its id. */
export const startScanJob = <E extends { readonly message: string }, R>(
  analysis: Effect.Effect<ScanAnalysis, E, R>,
) =>
  Effect.gen(function* () {
    yield* ensureScanCapacity;
    yield* makeRoomForJob;
    const outcome = yield* Deferred.make<FinishedScanJob>();
    const fiber = yield* analysis.pipe(
      Effect.map(
        (result): FinishedScanJob => ({ status: 'complete', analysis: result }),
      ),
      Effect.catch((error) =>
        Effect.logWarning('Scan analysis failed').pipe(
          Effect.annotateLogs(
            'errorType',
            '_tag' in error ? String(error._tag) : 'unknown',
          ),
          Effect.as<FinishedScanJob>({
            status: 'failed',
            error: error.message,
          }),
        ),
      ),
      Effect.catchDefect((defect) =>
        Effect.logError('Scan analysis crashed', Cause.die(defect)).pipe(
          Effect.as<FinishedScanJob>({
            status: 'failed',
            error: unexpectedFailure,
          }),
        ),
      ),
      Effect.flatMap((finished) => Deferred.succeed(outcome, finished)),
      Effect.forkDetach,
    );
    const id = crypto.randomUUID();
    getJobs().set(id, { startedAt: Date.now(), outcome, fiber });
    return id;
  });

/** Reads a job, waiting up to `waitFor` for it to finish. */
export const getScanJob = (id: string, waitFor: Duration.Input) =>
  Effect.gen(function* () {
    yield* removeExpiredJobs;
    const job = getJobs().get(id);
    if (!job) {
      return yield* new ScanJobNotFoundError({
        message:
          'This analysis is no longer available. Analyze the photos again.',
      });
    }
    const settled = yield* Deferred.poll(job.outcome);
    if (Option.isSome(settled)) {
      return yield* settled.value;
    }
    const finished = yield* Deferred.await(job.outcome).pipe(
      Effect.timeoutOption(waitFor),
    );
    return Option.getOrElse(
      finished,
      (): ScanJobState => ({ status: 'processing' }),
    );
  });

export const cancelScanJob = (id: string) => removeJob(id);
