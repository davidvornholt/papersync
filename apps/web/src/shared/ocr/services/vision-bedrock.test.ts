import { afterAll, afterEach, beforeEach, expect, it, spyOn } from 'bun:test';
// biome-ignore lint/correctness/noNodejsModules: This server configuration test isolates its runtime environment.
import process from 'node:process';
import { Effect, Schema } from 'effect';
import { WeekId } from '@/shared/types/schemas';
import { VisionProvider } from './vision-contract';
import { getVisionLayer } from './vision-selection';

const envKeys = [
  'BEDROCK_REGION',
  'BEDROCK_ACCESS_KEY_ID',
  'BEDROCK_SECRET_ACCESS_KEY',
  'AWS_BEARER_TOKEN_BEDROCK',
  'AWS_SESSION_TOKEN',
] as const;
const originalEnvironment = envKeys.map((key) => process.env[key]);
const fetchSpy = spyOn(globalThis, 'fetch');
const weekId = Schema.decodeUnknownSync(WeekId)('2026-W37');
const options = {
  provider: 'ollama' as const,
  ollamaEndpoint: 'http://untrusted.invalid',
  imageBase64: 'data:image/png;base64,aW1hZ2U=',
  weekId,
};
beforeEach(() => {
  process.env.BEDROCK_REGION = 'eu-central-1';
  process.env.BEDROCK_ACCESS_KEY_ID = 'fixture-access-key';
  process.env.BEDROCK_SECRET_ACCESS_KEY = 'fixture-secret-key';
  process.env.AWS_BEARER_TOKEN_BEDROCK = 'must-not-select-bearer-mode';
  process.env.AWS_SESSION_TOKEN = 'must-not-use-ambient-session';
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
    return yield* provider.extractHandwriting(options.imageBase64, weekId);
  });
const mockClaudeOutput = (output: unknown) =>
  fetchSpy.mockResolvedValue(
    Response.json({
      output: {
        message: {
          role: 'assistant',
          content: [{ text: JSON.stringify(output) }],
        },
      },
      stopReason: 'end_turn',
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
      metrics: { latencyMs: 1 },
    }),
  );

it('uses dedicated SigV4 keys and Sonnet 5.5 medium despite client and ambient AWS settings', async () => {
  mockClaudeOutput({
    weekId: '2026-W38',
    entries: [
      {
        day: 'Montag',
        subject: 'Mathematik',
        content: 'Aufgabe 3',
        dueDate: null,
      },
    ],
    confidence: 1,
  });
  const result = await Effect.runPromise(extract());
  expect(result.modelUsed).toBe('global.anthropic.claude-sonnet-5-5');
  expect(result.data.weekId).toBe(weekId);
  expect(result.data.entries).toEqual([
    {
      day: 'Monday',
      subject: 'Mathematik',
      content: 'Aufgabe 3',
      dueDate: undefined,
      action: 'add',
    },
  ]);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  const [request] = fetchSpy.mock.calls;
  expect(String(request?.[0])).toBe(
    'https://bedrock-runtime.eu-central-1.amazonaws.com/model/global.anthropic.claude-sonnet-5-5/converse',
  );
  const headers = new Headers(request?.[1]?.headers);
  expect(headers.get('Authorization')).toContain(
    'AWS4-HMAC-SHA256 Credential=fixture-access-key/',
  );
  expect(headers.has('x-amz-security-token')).toBe(false);
  const payload = JSON.parse(String(request?.[1]?.body)) as {
    additionalModelRequestFields: {
      thinking: { type: string };
      // biome-ignore lint/style/useNamingConvention: Anthropic's model request field.
      output_config: {
        effort: string;
        format: { type: string; schema: unknown };
      };
    };
    messages: Array<{
      content: Array<{ image: { format: string; source: { bytes: string } } }>;
    }>;
    toolConfig?: unknown;
  };
  expect(payload.additionalModelRequestFields.thinking.type).toBe('adaptive');
  expect(payload.additionalModelRequestFields.output_config.effort).toBe(
    'medium',
  );
  expect(payload.additionalModelRequestFields.output_config.format.type).toBe(
    'json_schema',
  );
  expect(
    payload.additionalModelRequestFields.output_config.format.schema,
  ).toHaveProperty('properties.entries');
  expect(payload.toolConfig).toBeUndefined();
  expect(payload.messages[0]?.content[0]?.image).toEqual({
    format: 'png',
    source: { bytes: 'aW1hZ2U=' },
  });
});

it.each([
  'missing-region',
  'missing-access-key',
  'missing-secret-key',
  'invalid-region',
  'blank-secret-key',
])(
  'fails closed for %s without leaking credentials or using a local provider',
  async (scenario) => {
    if (scenario === 'missing-region') {
      delete process.env.BEDROCK_REGION;
    }
    if (scenario === 'missing-access-key') {
      delete process.env.BEDROCK_ACCESS_KEY_ID;
    }
    if (scenario === 'missing-secret-key') {
      delete process.env.BEDROCK_SECRET_ACCESS_KEY;
    }
    if (scenario === 'invalid-region') {
      process.env.BEDROCK_REGION = 'https://untrusted.invalid';
    }
    if (scenario === 'blank-secret-key') {
      process.env.BEDROCK_SECRET_ACCESS_KEY = ' ';
    }
    const error = await Effect.runPromise(Effect.flip(extract()));
    expect(error.message).toContain('server administrator');
    expect(JSON.stringify(error)).not.toContain('fixture-secret-key');
    expect(fetchSpy).not.toHaveBeenCalled();
  },
);
it('reports Bedrock denial without falling back to a client provider', async () => {
  fetchSpy.mockResolvedValue(
    new Response('', { status: 403, statusText: 'Forbidden' }),
  );
  const result = await Effect.runPromise(extract().pipe(Effect.either));
  expect(result._tag).toBe('Left');
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
it.each([
  ['invalid confidence', { weekId: '2026-W37', entries: [], confidence: 2 }],
  ['invalid week', { weekId: '2026-W99', entries: [], confidence: 1 }],
  [
    'missing deadline',
    {
      weekId: '2026-W37',
      entries: [{ day: 'Monday', subject: 'Math', content: 'Exercise 3' }],
      confidence: 1,
    },
  ],
  [
    'impossible deadline',
    {
      weekId: '2026-W37',
      entries: [
        {
          day: 'Monday',
          subject: 'Math',
          content: 'Exercise 3',
          dueDate: '2026-02-30',
        },
      ],
      confidence: 1,
    },
  ],
])('rejects Claude output with %s without falling back', async (_, output) => {
  mockClaudeOutput(output);
  const result = await Effect.runPromise(extract().pipe(Effect.either));
  expect(result._tag).toBe('Left');
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
