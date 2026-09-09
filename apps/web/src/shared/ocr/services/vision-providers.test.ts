import { afterAll, afterEach, expect, it, spyOn } from 'bun:test';
import { Effect, Schema } from 'effect';
import { ISODate, WeekId } from '@/shared/types/schemas';
import { createGoogleVisionProvider } from './vision-google-provider';
import { createOllamaVisionProvider } from './vision-ollama-provider';
import { OCRResponseJsonSchema } from './vision-schema';

const fetchSpy = spyOn(globalThis, 'fetch');
afterEach(() => fetchSpy.mockReset());
afterAll(() => fetchSpy.mockRestore());
const week = Schema.decodeUnknownSync(WeekId)('2026-W37');
const image = 'data:image/png;base64,aW1hZ2U=';
const entry = {
  day: 'Montag',
  subject: 'Mathematik',
  content: 'Aufgabe 3',
  isTask: true,
  dueDate: Schema.decodeUnknownSync(ISODate)('2026-09-10'),
};
const googleResponse = (value: unknown) =>
  Response.json({
    candidates: [
      {
        content: { role: 'model', parts: [{ text: JSON.stringify(value) }] },
        finishReason: 'STOP',
      },
    ],
  });
it('validates Google output, defaults completion, and normalizes the written day', async () => {
  fetchSpy.mockResolvedValue(
    googleResponse({ entries: [entry], confidence: 1 }),
  );
  const result = await Effect.runPromise(
    createGoogleVisionProvider('fixture-key').extractHandwriting(
      image,
      week,
      '',
    ),
  );
  const [request] = fetchSpy.mock.calls;
  expect(String(request?.[0])).toContain('/gemini-3.8-flash:generateContent');
  const body = JSON.parse(String(request?.[1]?.body)) as {
    generationConfig: { thinkingConfig: { thinkingLevel: string } };
  };
  expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe('high');
  expect(result.data.entries).toEqual([
    { ...entry, day: 'Monday', isCompleted: false, action: 'add' },
  ]);
});
it.each([
  ['accepts null and maps it to the optional domain field', null, 'Right'],
  ['rejects a missing dueDate', undefined, 'Left'],
  ['rejects an impossible date', '2026-02-30', 'Left'],
] as const)('enforces dueDate as date-or-null: %s', async (_, dueDate, tag) => {
  const modelEntry: Record<string, unknown> = { ...entry };
  if (dueDate === undefined) {
    delete modelEntry.dueDate;
  } else {
    modelEntry.dueDate = dueDate;
  }
  fetchSpy.mockResolvedValue(
    googleResponse({ entries: [modelEntry], confidence: 1 }),
  );
  const result = await Effect.runPromise(
    createGoogleVisionProvider('fixture-key')
      .extractHandwriting(image, week, '')
      .pipe(Effect.either),
  );
  expect(result._tag).toBe(tag);
  if (result._tag === 'Right') {
    expect(result.right.data.entries[0]?.dueDate).toBeUndefined();
  }
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
it('rejects invalid Gemini output', async () => {
  fetchSpy.mockResolvedValue(
    googleResponse({ entries: [entry], confidence: 9 }),
  );
  const result = await Effect.runPromise(
    createGoogleVisionProvider('fixture-key')
      .extractHandwriting(image, week, '')
      .pipe(Effect.either),
  );
  expect(result._tag).toBe('Left');
});
it('sends Ollama the OCR schema and rejects malformed model output', async () => {
  const provider = createOllamaVisionProvider('http://localhost:11434');
  fetchSpy.mockResolvedValue(
    Response.json({
      response: JSON.stringify({
        entries: [{ ...entry, dueDate: null }],
        confidence: 1,
      }),
    }),
  );
  expect(
    (await Effect.runPromise(provider.extractHandwriting(image, week, ''))).data
      .entries,
  ).toEqual([
    {
      ...entry,
      day: 'Monday',
      isCompleted: false,
      action: 'add',
      dueDate: undefined,
    },
  ]);
  const request = fetchSpy.mock.calls[0]?.[1];
  const payload = JSON.parse(String(request?.body)) as {
    format?: unknown;
    prompt?: string;
  };
  expect(payload.format).toEqual(OCRResponseJsonSchema);
  expect(payload.prompt).toContain('Use these exact camelCase key names');
  expect(payload.prompt).toContain('isCompleted (optional)');
  expect(payload.prompt).toContain('dueDate (required)');
  expect(payload.prompt).toContain('YYYY-MM-DD date or null');
  expect(payload.prompt).toContain(
    'associate its line with the entry it belongs to',
  );
  fetchSpy.mockResolvedValue(Response.json({ response: 'unreadable' }));
  expect(
    (
      await Effect.runPromise(
        provider.extractHandwriting(image, week, '').pipe(Effect.either),
      )
    )._tag,
  ).toBe('Left');
});
