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
  images: [
    {
      mediaType: 'image/png' as const,
      data: new TextEncoder().encode('image'),
    },
    {
      mediaType: 'image/jpeg' as const,
      data: new TextEncoder().encode('second'),
    },
  ],
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
    return yield* provider.extractHandwriting(options.images, weekId);
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
  const signedRequest = request?.[0];
  expect(signedRequest).toBeInstanceOf(Request);
  if (!(signedRequest instanceof Request)) {
    throw new Error('Expected a signed HTTP request');
  }
  expect(signedRequest.url).toBe(
    'https://bedrock-runtime.eu-central-1.amazonaws.com/model/global.anthropic.claude-sonnet-5-5/converse',
  );
  const { headers } = signedRequest;
  expect(headers.get('Authorization')).toContain(
    'AWS4-HMAC-SHA256 Credential=fixture-access-key/',
  );
  expect(headers.has('x-amz-security-token')).toBe(false);
  const payload = (await signedRequest.json()) as {
    additionalModelRequestFields: { thinking: { type: string } };
    outputConfig: { effort: string; textFormat?: unknown };
    system: Array<{ text: string }>;
    messages: Array<{
      content: Array<{ image: { format: string; source: { bytes: string } } }>;
    }>;
    toolConfig?: unknown;
  };
  expect(payload.additionalModelRequestFields.thinking.type).toBe('adaptive');
  expect(payload.outputConfig.effort).toBe('medium');
  expect(payload.outputConfig.textFormat).toBeUndefined();
  expect(payload.system[0]?.text).toContain(
    'Return JSON matching this schema:',
  );
  expect(payload.system[0]?.text).toContain(
    'The 2 images are pages of the same sheet',
  );
  expect(payload.toolConfig).toBeUndefined();
  expect(payload.messages[0]?.content.map((block) => block.image)).toEqual([
    { format: 'png', source: { bytes: 'aW1hZ2U=' } },
    { format: 'jpeg', source: { bytes: 'c2Vjb25k' } },
  ]);
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
  const result = await Effect.runPromise(extract().pipe(Effect.result));
  expect(result._tag).toBe('Failure');
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
  const result = await Effect.runPromise(extract().pipe(Effect.result));
  expect(result._tag).toBe('Failure');
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

it.each(['max_tokens', 'refusal'])(
  'rejects unfinished Claude responses even when the partial JSON validates: %s',
  async (stopReason) => {
    fetchSpy.mockResolvedValue(
      Response.json({
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  weekId: '2026-W37',
                  entries: [],
                  confidence: 1,
                }),
              },
            ],
          },
        },
        stopReason,
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        metrics: { latencyMs: 1 },
      }),
    );
    expect((await Effect.runPromise(extract().pipe(Effect.result)))._tag).toBe(
      'Failure',
    );
  },
);

it('rejects malformed JSON rather than attempting to repair or save it', async () => {
  fetchSpy.mockResolvedValue(
    Response.json({
      output: {
        message: { role: 'assistant', content: [{ text: 'not valid JSON' }] },
      },
      stopReason: 'end_turn',
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
      metrics: { latencyMs: 1 },
    }),
  );
  expect((await Effect.runPromise(extract().pipe(Effect.result)))._tag).toBe(
    'Failure',
  );
});
