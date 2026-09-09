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
  expect(result.data.entries).toEqual([
    { ...entry, day: 'Monday', isCompleted: false, action: 'add' },
  ]);
});
it('retries another Google model when output contains an impossible date', async () => {
  fetchSpy.mockResolvedValueOnce(
    googleResponse({
      entries: [{ ...entry, dueDate: '2026-02-30' }],
      confidence: 1,
    }),
  );
  fetchSpy.mockResolvedValueOnce(
    googleResponse({ entries: [entry], confidence: 1 }),
  );
  const result = await Effect.runPromise(
    createGoogleVisionProvider('fixture-key').extractHandwriting(
      image,
      week,
      '',
    ),
  );
  expect(result.data.entries[0]?.dueDate).toBe(entry.dueDate);
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});
it('rejects invalid output from every Google model', async () => {
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
    Response.json({ response: '```json\n{"entries":[],"confidence":1}\n```' }),
  );
  expect(
    (await Effect.runPromise(provider.extractHandwriting(image, week, ''))).data
      .entries,
  ).toEqual([]);
  const request = fetchSpy.mock.calls[0]?.[1];
  const payload = JSON.parse(String(request?.body)) as {
    format?: unknown;
    prompt?: string;
  };
  expect(payload.format).toEqual(OCRResponseJsonSchema);
  expect(payload.prompt).toContain('Use these exact camelCase key names');
  expect(payload.prompt).toContain('isCompleted (optional)');
  expect(payload.prompt).toContain('dueDate (optional)');
  fetchSpy.mockResolvedValue(Response.json({ response: 'unreadable' }));
  expect(
    (
      await Effect.runPromise(
        provider.extractHandwriting(image, week, '').pipe(Effect.either),
      )
    )._tag,
  ).toBe('Left');
});
