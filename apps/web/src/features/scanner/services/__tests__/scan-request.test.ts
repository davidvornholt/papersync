import { describe, expect, it } from 'bun:test';
import { Effect, Either } from 'effect';
import {
  scanPageByteLimit,
  scanPageLimit,
  scanUploadByteLimit,
} from '../scan-limits';
import { parseScanRequest } from '../scan-request';

const badRequest = 400;
const payloadTooLarge = 413;

const signatures: Record<string, string> = {
  jpeg: '\xFF\xD8\xFF\xE0',
  png: '\x89PNG\r\n\x1A\n',
  webp: 'RIFF\0\0\0\0WEBP',
  gif: 'GIF89a',
};
const page = (format = 'jpeg', content = 'photo') =>
  new File(
    [
      Uint8Array.from(signatures[format] ?? '', (c) => c.charCodeAt(0)),
      content,
    ],
    'page',
  );
const pageContent = /(?<content>front|back)$/u;
const decodeContent = (data: Uint8Array) =>
  pageContent.exec(new TextDecoder().decode(data))?.groups?.content;
const upload = (
  pages: ReadonlyArray<File>,
  fields: Record<string, string> = {},
) => {
  const form = new FormData();
  for (const file of pages) {
    form.append('page', file);
  }
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return Effect.runPromise(
    parseScanRequest(
      new Request('http://localhost/api/scans', { method: 'POST', body: form }),
    ).pipe(Effect.either),
  );
};
const rejection = async (
  pages: ReadonlyArray<File>,
  fields?: Record<string, string>,
) => {
  const result = await upload(pages, fields);
  return Either.isLeft(result) ? result.left.status : null;
};

describe('scan uploads', () => {
  it('reads every page in order with the browser AI settings', async () => {
    const result = await upload([page('jpeg', 'front'), page('png', 'back')], {
      weekId: '2026-W37',
      provider: 'ollama',
      ollamaEndpoint: 'http://localhost:11434',
    });
    const input = Either.getOrThrow(result);
    expect(input.pages.map((item) => decodeContent(item.data))).toEqual([
      'front',
      'back',
    ]);
    expect(input.pages.map((item) => item.mediaType)).toEqual([
      'image/jpeg',
      'image/png',
    ]);
    expect(String(input.weekId)).toBe('2026-W37');
    expect(input.vision).toEqual({
      provider: 'ollama',
      googleApiKey: undefined,
      ollamaEndpoint: 'http://localhost:11434',
    });
  });

  it('rejects missing, excess, unsupported, and oversized pages and malformed weeks', async () => {
    expect(await rejection([])).toBe(badRequest);
    expect(
      await rejection(Array.from({ length: scanPageLimit + 1 }, () => page())),
    ).toBe(payloadTooLarge);
    expect(await rejection([page('gif')])).toBe(badRequest);
    expect(await rejection([page('webp')])).toBeNull();
    expect(await rejection([page('jpeg', 'x'.repeat(scanPageByteLimit))])).toBe(
      payloadTooLarge,
    );
    expect(await rejection([page()], { weekId: '2026-37' })).toBe(badRequest);
  });

  it('rejects oversized uploads before buffering them', async () => {
    const unread = new ReadableStream({
      pull: () => {
        throw new Error('The body must not be read.');
      },
    });
    const declared = await Effect.runPromise(
      parseScanRequest(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          body: unread,
          headers: { 'content-length': String(scanUploadByteLimit + 1) },
        }),
      ).pipe(Effect.either),
    );
    expect(Either.isLeft(declared) && declared.left.status).toBe(
      payloadTooLarge,
    );

    const chunk = new Uint8Array(scanPageByteLimit);
    const pieces = scanUploadByteLimit / scanPageByteLimit + 1;
    let sent = 0;
    const streamed = await Effect.runPromise(
      parseScanRequest(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          body: new ReadableStream({
            pull: (controller) => {
              sent += 1;
              if (sent > pieces) {
                controller.close();
                return;
              }
              controller.enqueue(chunk);
            },
          }),
        }),
      ).pipe(Effect.either),
    );
    expect(Either.isLeft(streamed) && streamed.left.status).toBe(
      payloadTooLarge,
    );
    expect(sent).toBeLessThanOrEqual(pieces);
  });
});
