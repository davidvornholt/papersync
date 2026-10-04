import { afterEach, describe, expect, it } from 'bun:test';
import { Duration, Effect, Result, Schema } from 'effect';
import { WeekId } from '@/shared/types/schemas';
import type { ScanAnalysis } from '../scan-analysis';
import { cancelScanJob, getScanJob, startScanJob } from '../scan-jobs';

const analysis: ScanAnalysis = {
  data: {
    weekId: Schema.decodeUnknownSync(WeekId)('2026-W37'),
    entries: [],
    confidence: 1,
  },
  modelUsed: 'fixture',
};
const noWait = Duration.zero;
const runningJobLimit = 2;
const tooManyRequests = 429;
const started: Array<string> = [];
const start = (
  job: Effect.Effect<ScanAnalysis, { readonly message: string }>,
) =>
  Effect.runPromise(startScanJob(job)).then((id) => {
    started.push(id);
    return id;
  });
const read = (id: string, waitFor: Duration.Input = noWait) =>
  Effect.runPromise(getScanJob(id, waitFor).pipe(Effect.result));

afterEach(() =>
  Effect.runPromise(
    Effect.forEach(started.splice(0), cancelScanJob, { discard: true }),
  ),
);

describe('scan jobs', () => {
  it('keeps the result for the browser after the request that started it', async () => {
    const id = await start(Effect.succeed(analysis));
    expect(await read(id, Duration.seconds(1))).toEqual(
      Result.succeed({ status: 'complete', analysis }),
    );
    expect(await read(id)).toEqual(
      Result.succeed({ status: 'complete', analysis }),
    );
  });

  it('reports processing while the wait times out', async () => {
    const id = await start(Effect.never);
    expect(await read(id, Duration.millis(10))).toEqual(
      Result.succeed({ status: 'processing' }),
    );
  });

  it('reports expected failures with their message and crashes generically', async () => {
    const failed = await start(Effect.fail({ message: 'Gemini is down.' }));
    expect(await read(failed, Duration.seconds(1))).toEqual(
      Result.succeed({ status: 'failed', error: 'Gemini is down.' }),
    );
    const crashed = await start(Effect.die('boom'));
    const result = await read(crashed, Duration.seconds(1));
    expect(Result.getOrNull(result)).toMatchObject({ status: 'failed' });
  });

  it('forgets cancelled and unknown jobs', async () => {
    const id = await start(Effect.never);
    await Effect.runPromise(cancelScanJob(id));
    const cancelled = await read(id);
    expect(Result.isFailure(cancelled) && cancelled.failure._tag).toBe(
      'ScanJobNotFoundError',
    );
    const unknown = await read('missing');
    expect(Result.isFailure(unknown) && unknown.failure._tag).toBe(
      'ScanJobNotFoundError',
    );
  });

  it('limits how many analyses run at once', async () => {
    await Promise.all(
      Array.from({ length: runningJobLimit }, () => start(Effect.never)),
    );
    const result = await Effect.runPromise(
      startScanJob(Effect.never).pipe(Effect.result),
    );
    expect(Result.isFailure(result) && result.failure.status).toBe(
      tooManyRequests,
    );
  });
});
