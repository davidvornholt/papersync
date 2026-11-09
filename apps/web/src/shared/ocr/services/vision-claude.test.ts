import { afterAll, afterEach, beforeEach, expect, it, spyOn } from 'bun:test';
// biome-ignore lint/correctness/noNodejsModules: This server configuration test isolates its runtime environment.
import process from 'node:process';
import { Cause, Effect, Schema } from 'effect';
import { WeekId } from '@/shared/types/schemas';
import { VisionProvider } from './vision-contract';
import { getVisionLayer } from './vision-selection';

const apiKey = 'fixture-claude-api-key';
const envKeys = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_LOG',
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
const validOutput = { weekId: '2026-W37', entries: [], confidence: 1 };
beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = apiKey;
  // Ambient SDK settings the provider must ignore.
  process.env.ANTHROPIC_AUTH_TOKEN = 'must-not-use-ambient-token';
  process.env.ANTHROPIC_BASE_URL = 'http://untrusted.invalid';
  process.env.ANTHROPIC_LOG = 'debug';
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
const claudeMessage = ({
  output = validOutput,
  text = JSON.stringify(output),
  stopReason = 'end_turn',
  model = 'claude-sonnet-5-5',
  content = [{ type: 'text', text }],
}: {
  readonly output?: unknown;
  readonly text?: string;
  readonly stopReason?: string;
  readonly model?: string;
  readonly content?: ReadonlyArray<unknown>;
} = {}) =>
  Response.json({
    id: 'msg_fixture',
    type: 'message',
    role: 'assistant',
    model,
    content,
    // biome-ignore lint/style/useNamingConvention: Claude API field name.
    stop_reason: stopReason,
    // biome-ignore lint/style/useNamingConvention: Claude API field name.
    stop_sequence: null,
    // biome-ignore lint/style/useNamingConvention: Claude API field name.
    usage: { input_tokens: 10, output_tokens: 10 },
  });
const apiError = (status: number, type: string, message = 'Fixture error.') =>
  Response.json(
    { type: 'error', error: { type, message } },
    // A short retry-after-ms keeps retried attempts fast.
    { status, headers: { 'retry-after-ms': '1' } },
  );
const sentRequest = (call = 0) => {
  const [input, init] = fetchSpy.mock.calls[call] ?? [];
  if (input === undefined) {
    throw new Error(`Expected fetch call ${call}`);
  }
  return new Request(input, init);
};

it('sends the scan to Sonnet 5.5 on the Claude API with structured output and fallback', async () => {
  fetchSpy.mockResolvedValue(
    claudeMessage({
      output: {
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
      },
    }),
  );
  // ANTHROPIC_LOG=debug would log the request, scan included.
  const debugLog = spyOn(console, 'debug').mockImplementation(() => undefined);
  const result = await Effect.runPromise(extract()).finally(() => {
    const debugLogCalls = debugLog.mock.calls.length;
    debugLog.mockRestore();
    expect(debugLogCalls).toBe(0);
  });
  expect(result.modelUsed).toBe('claude-sonnet-5-5');
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
  const request = sentRequest();
  expect(new URL(request.url).origin + new URL(request.url).pathname).toBe(
    'https://api.anthropic.com/v1/messages',
  );
  // The server key, not the ambient ANTHROPIC_AUTH_TOKEN.
  expect(request.headers.get('authorization')).toBe(`Bearer ${apiKey}`);
  expect(request.headers.get('anthropic-beta')).toBe(
    'server-side-fallback-2026-07-01',
  );
  const payload = (await request.json()) as {
    model: string;
    fallbacks: unknown;
    thinking: { type: string };
    // biome-ignore lint/style/useNamingConvention: Claude API field name.
    output_config: {
      effort: string;
      format: { type: string; schema: Record<string, unknown> };
    };
    system: string;
    messages: Array<{
      role: string;
      content: Array<{
        type: string;
        // biome-ignore lint/style/useNamingConvention: Claude API field name.
        source: { type: string; media_type: string; data: string };
      }>;
    }>;
  };
  expect(payload.model).toBe('claude-sonnet-5-5');
  expect(payload.fallbacks).toBe('default');
  expect(payload.thinking.type).toBe('adaptive');
  expect(payload.output_config.effort).toBe('medium');
  expect(payload.output_config.format.type).toBe('json_schema');
  const schema = JSON.stringify(payload.output_config.format.schema);
  for (const keyword of [
    '"$schema"',
    '"minimum"',
    '"maximum"',
    '"minLength"',
  ]) {
    expect(schema).not.toContain(keyword);
  }
  expect(payload.output_config.format.schema.additionalProperties).toBe(false);
  expect(payload.system).toContain('The 2 images are pages of the same sheet');
  expect(payload.messages).toHaveLength(1);
  expect(payload.messages[0]?.role).toBe('user');
  expect(payload.messages[0]?.content).toEqual([
    {
      type: 'image',
      // biome-ignore lint/style/useNamingConvention: Claude API field name.
      source: { type: 'base64', media_type: 'image/png', data: 'aW1hZ2U=' },
    },
    {
      type: 'image',
      // biome-ignore lint/style/useNamingConvention: Claude API field name.
      source: { type: 'base64', media_type: 'image/jpeg', data: 'c2Vjb25k' },
    },
  ]);
});

it('reports the model that answered after a server-side fallback', async () => {
  fetchSpy.mockResolvedValue(
    claudeMessage({
      model: 'claude-sonnet-5',
      content: [
        {
          type: 'fallback',
          from: { model: 'claude-sonnet-5-5' },
          to: { model: 'claude-sonnet-5' },
          trigger: 'refusal',
        },
        { type: 'text', text: JSON.stringify(validOutput) },
      ],
    }),
  );
  const result = await Effect.runPromise(extract());
  expect(result.modelUsed).toBe('claude-sonnet-5');
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

it.each([
  ['missing', undefined],
  ['blank', ' \t'],
])(
  'leaves AI unconfigured when the server key is %s',
  async (_, configuredKey) => {
    if (configuredKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = configuredKey;
    }
    const error = await Effect.runPromise(
      Effect.flip(getVisionLayer({ provider: 'google' })),
    );
    expect(error._tag).toBe('VisionConfigurationError');
    expect(error.message).toContain('Configure the Claude API on the server');
    expect(fetchSpy).not.toHaveBeenCalled();
  },
);

it.each([
  [401, 'authentication_error'],
  [403, 'permission_error'],
])(
  'reports a rejected key (%i) as a configuration failure without retrying or falling back',
  async (status, type) => {
    fetchSpy.mockResolvedValueOnce(apiError(status, type));
    const error = await Effect.runPromise(Effect.flip(extract()));
    expect(error._tag).toBe('VisionConfigurationError');
    expect(error.message).toContain('ANTHROPIC_API_KEY');
    expect(JSON.stringify(error)).not.toContain(apiKey);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  },
);

it.each([
  [429, 'rate_limit_error'],
  [500, 'api_error'],
  [529, 'overloaded_error'],
])(
  'retries %i twice before reporting an extraction failure',
  async (status, type) => {
    fetchSpy
      .mockResolvedValueOnce(apiError(status, type))
      .mockResolvedValueOnce(apiError(status, type))
      .mockResolvedValueOnce(apiError(status, type));
    const error = await Effect.runPromise(Effect.flip(extract()));
    expect(error._tag).toBe('VisionError');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  },
);

it('succeeds when a retried attempt answers', async () => {
  fetchSpy
    .mockResolvedValueOnce(apiError(529, 'overloaded_error'))
    .mockResolvedValueOnce(claudeMessage());
  const result = await Effect.runPromise(extract());
  expect(result.data.confidence).toBe(1);
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});

it('retries a connection failure', async () => {
  fetchSpy
    .mockRejectedValueOnce(new TypeError('fetch failed'))
    .mockResolvedValueOnce(claudeMessage());
  const result = await Effect.runPromise(extract());
  expect(result.data.confidence).toBe(1);
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});

it('does not retry a rejected request or keep what the API quoted from it', async () => {
  const quotedRequest = 'fixture-quoted-scan-content';
  fetchSpy.mockResolvedValueOnce(
    apiError(400, 'invalid_request_error', `Invalid value: ${quotedRequest}`),
  );
  const error = await Effect.runPromise(Effect.flip(extract()));
  expect(error._tag).toBe('VisionError');
  expect(JSON.stringify(error)).not.toContain(quotedRequest);
  expect(Cause.pretty(Cause.fail(error))).not.toContain(quotedRequest);
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
])(
  'rejects Claude output with %s without quoting it or falling back',
  async (_, output) => {
    fetchSpy.mockResolvedValue(claudeMessage({ output }));
    const error = await Effect.runPromise(Effect.flip(extract()));
    expect(error._tag).toBe('VisionError');
    expect(JSON.stringify(error)).not.toContain('Exercise 3');
    expect(JSON.stringify(error)).not.toContain('2026-W99');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  },
);

it.each(['max_tokens', 'refusal'])(
  'rejects unfinished Claude responses even when the partial JSON validates: %s',
  async (stopReason) => {
    fetchSpy.mockResolvedValue(claudeMessage({ stopReason }));
    const error = await Effect.runPromise(Effect.flip(extract()));
    expect(error._tag).toBe('VisionError');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  },
);

it('rejects malformed JSON rather than attempting to repair or save it', async () => {
  fetchSpy.mockResolvedValue(claudeMessage({ text: 'not valid JSON' }));
  const error = await Effect.runPromise(Effect.flip(extract()));
  expect(error._tag).toBe('VisionError');
  expect(JSON.stringify(error)).not.toContain('not valid JSON');
});
