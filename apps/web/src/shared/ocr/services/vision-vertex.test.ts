import { afterAll, afterEach, beforeEach, expect, it, spyOn } from 'bun:test';
// biome-ignore lint/correctness/noNodejsModules: Bun test generates a disposable RSA key for the OAuth exchange.
import { generateKeyPairSync } from 'node:crypto';
// biome-ignore lint/correctness/noNodejsModules: This server configuration test isolates its runtime environment.
import process from 'node:process';
import { Effect, Schema } from 'effect';
import { WeekId } from '@/shared/types/schemas';
import { VisionProvider } from './vision-contract';
import { getVisionLayer } from './vision-selection';

const envKeys = [
  'GOOGLE_VERTEX_PROJECT',
  'GOOGLE_VERTEX_LOCATION',
  'GOOGLE_VERTEX_CREDENTIALS_JSON',
  'GOOGLE_VERTEX_API_KEY',
] as const;
const originalEnvironment = envKeys.map((key) => process.env[key]);
const fetchSpy = spyOn(globalThis, 'fetch');
const privateKey = generateKeyPairSync('rsa', {
  modulusLength: 2048,
}).privateKey.export({ type: 'pkcs8', format: 'pem' });
const weekId = Schema.decodeUnknownSync(WeekId)('2026-W37');
const options = {
  provider: 'ollama' as const,
  ollamaEndpoint: 'http://untrusted.invalid',
  imageBase64: 'data:image/png;base64,aW1hZ2U=',
  weekId,
};
beforeEach(() => {
  process.env.GOOGLE_VERTEX_PROJECT = 'fixture-project';
  process.env.GOOGLE_VERTEX_LOCATION = 'global';
  process.env.GOOGLE_VERTEX_CREDENTIALS_JSON = JSON.stringify({
    type: 'service_account',
    // biome-ignore lint/style/useNamingConvention: Google service-account JSON field.
    client_email: 'fixture@fixture-project.iam.gserviceaccount.com',
    // biome-ignore lint/style/useNamingConvention: Google service-account JSON field.
    private_key: privateKey,
  });
  process.env.GOOGLE_VERTEX_API_KEY = 'must-not-select-express-mode';
});
afterEach(() => {
  envKeys.forEach((key, index) => {
    const value = originalEnvironment[index];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
  fetchSpy.mockReset();
});
afterAll(() => fetchSpy.mockRestore());

const extract = () =>
  Effect.gen(function* () {
    const layer = yield* getVisionLayer(options);
    const provider = yield* Effect.provide(VisionProvider, layer);
    return yield* provider.extractHandwriting(options.imageBase64, weekId, '');
  });

it('uses service-account OAuth and the exact high-reasoning Vertex model despite client provider settings', async () => {
  fetchSpy.mockResolvedValueOnce(
    // biome-ignore lint/style/useNamingConvention: OAuth token endpoint response field.
    Response.json({ access_token: 'fixture-access-token' }),
  );
  fetchSpy.mockResolvedValueOnce(
    Response.json({
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: JSON.stringify({ entries: [], confidence: 1 }) }],
          },
          finishReason: 'STOP',
        },
      ],
    }),
  );
  const result = await Effect.runPromise(extract());
  expect(result.data.entries).toEqual([]);
  expect(result.modelUsed).toBe('gemini-3.8-flash');
  expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
    'https://oauth2.googleapis.com/token',
  );
  const [, request] = fetchSpy.mock.calls;
  expect(String(request?.[0])).toBe(
    'https://aiplatform.googleapis.com/v1beta1/projects/fixture-project/locations/global/publishers/google/models/gemini-3.8-flash:generateContent',
  );
  const headers = new Headers(request?.[1]?.headers);
  expect(headers.get('Authorization')).toBe('Bearer fixture-access-token');
  expect(headers.has('x-goog-api-key')).toBe(false);
  const payload = JSON.parse(String(request?.[1]?.body)) as {
    generationConfig: { thinkingConfig: { thinkingLevel: string } };
  };
  expect(payload.generationConfig.thinkingConfig.thinkingLevel).toBe('high');
});

it.each(['missing-project', 'missing-credentials', 'malformed-credentials'])(
  'fails closed for %s without leaking credentials or using a local provider',
  async (scenario) => {
    if (scenario === 'missing-project') {
      delete process.env.GOOGLE_VERTEX_PROJECT;
    }
    if (scenario === 'missing-credentials') {
      delete process.env.GOOGLE_VERTEX_CREDENTIALS_JSON;
    }
    if (scenario === 'malformed-credentials') {
      process.env.GOOGLE_VERTEX_CREDENTIALS_JSON =
        'private-fixture-invalid-json';
    }
    const error = await Effect.runPromise(Effect.flip(extract()));
    expect(error.message).toContain('server administrator');
    expect(JSON.stringify(error)).not.toContain('private-fixture-invalid-json');
    expect(fetchSpy).not.toHaveBeenCalled();
  },
);

it('reports OAuth denial without falling back to a client provider', async () => {
  fetchSpy.mockResolvedValue(
    new Response('', { status: 403, statusText: 'Forbidden' }),
  );
  const result = await Effect.runPromise(extract().pipe(Effect.either));
  expect(result._tag).toBe('Left');
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
