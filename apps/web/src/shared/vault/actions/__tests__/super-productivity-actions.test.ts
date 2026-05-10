import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { testSuperProductivityConnection } from '../super-productivity-actions';

const originalFetch = globalThis.fetch;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('testSuperProductivityConnection', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns ok with the trimmed endpoint when health responds successfully', async () => {
    const calls: string[] = [];
    globalThis.fetch = ((input: RequestInfo | URL) => {
      calls.push(input.toString());
      return Promise.resolve(
        jsonResponse({ ok: true, data: { server: 'up' } }),
      );
    }) as typeof fetch;

    const result = await testSuperProductivityConnection(
      '  http://127.0.0.1:3876  ',
    );

    expect(result).toEqual({ ok: true, endpoint: 'http://127.0.0.1:3876' });
    expect(calls).toEqual(['http://127.0.0.1:3876/health']);
  });

  it('falls back to the default endpoint when none is provided', async () => {
    const calls: string[] = [];
    globalThis.fetch = ((input: RequestInfo | URL) => {
      calls.push(input.toString());
      return Promise.resolve(
        jsonResponse({ ok: true, data: { server: 'up' } }),
      );
    }) as typeof fetch;

    const result = await testSuperProductivityConnection(undefined);

    expect(result.ok).toBe(true);
    expect(calls).toEqual(['http://127.0.0.1:3876/health']);
  });

  it('returns a failed result with the API error message when the call fails', async () => {
    globalThis.fetch = ((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(
        jsonResponse(
          {
            ok: false,
            error: { code: 'UNAVAILABLE', message: 'REST API disabled' },
          },
          503,
        ),
      )) as typeof fetch;

    const result = await testSuperProductivityConnection(
      'http://127.0.0.1:3876',
    );

    expect(result).toEqual({ ok: false, error: 'REST API disabled' });
  });

  it('returns a failed result when the endpoint is unreachable', async () => {
    globalThis.fetch = ((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.reject(new Error('connect ECONNREFUSED'))) as typeof fetch;

    const result = await testSuperProductivityConnection(
      'http://127.0.0.1:3876',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('ECONNREFUSED');
    }
  });
});
