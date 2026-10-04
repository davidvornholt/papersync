import { Effect, Schema } from 'effect';
import type {
  ScanImage,
  ScanImageType,
} from '@/shared/ocr/services/vision-contract';
import { WeekId } from '@/shared/types/schemas';
import { ScanRequestError } from '../errors/scan-jobs';
import type { ScanAnalysisInput } from './scan-analysis';
import {
  scanPageByteLimit,
  scanPageLimit,
  scanUploadByteLimit,
} from './scan-limits';

const badRequestStatus = 400;
const payloadTooLargeStatus = 413;

// Identify photos by their leading bytes: browsers and multipart parsers
// disagree on declared types, and the declared type is client input anyway.
const startsWith = (bytes: Uint8Array, signature: string, offset = 0) =>
  [...signature].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
const webpOffset = 8;
const detectImageType = (bytes: Uint8Array): ScanImageType | null => {
  if (startsWith(bytes, '\xFF\xD8\xFF')) {
    return 'image/jpeg';
  }
  if (startsWith(bytes, '\x89PNG\r\n\x1A\n')) {
    return 'image/png';
  }
  if (startsWith(bytes, 'RIFF') && startsWith(bytes, 'WEBP', webpOffset)) {
    return 'image/webp';
  }
  return null;
};

const readText = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;
};

const readPages = (form: FormData) =>
  Effect.gen(function* () {
    const files = form
      .getAll('page')
      .filter((value): value is File => value instanceof File);
    if (files.length === 0) {
      return yield* new ScanRequestError({
        message: 'Add a photo of the sheet.',
        status: badRequestStatus,
      });
    }
    if (files.length > scanPageLimit) {
      return yield* new ScanRequestError({
        message: `Analyze up to ${scanPageLimit} photos at once.`,
        status: payloadTooLargeStatus,
      });
    }
    return yield* Effect.forEach(files, (file) =>
      Effect.gen(function* () {
        if (file.size > scanPageByteLimit) {
          return yield* new ScanRequestError({
            message: 'Each photo must be 4 MB or smaller.',
            status: payloadTooLargeStatus,
          });
        }
        const bytes = yield* Effect.tryPromise({
          try: () => file.arrayBuffer(),
          catch: () =>
            new ScanRequestError({
              message: 'A photo could not be uploaded. Retry the analysis.',
              status: badRequestStatus,
            }),
        });
        const data = new Uint8Array(bytes);
        const mediaType = detectImageType(data);
        if (!mediaType) {
          return yield* new ScanRequestError({
            message: 'Photos must be JPEG, PNG, or WebP images.',
            status: badRequestStatus,
          });
        }
        return { data, mediaType } satisfies ScanImage;
      }),
    );
  });

const uploadTooLarge = () =>
  new ScanRequestError({
    message: 'These photos are too large to analyze together. Remove some.',
    status: payloadTooLargeStatus,
  });

type Chunk = Uint8Array<ArrayBuffer>;
type BodyReader = ReadableStreamDefaultReader<Chunk>;
const readUpTo = async (
  reader: BodyReader,
  limit: number,
  chunks: Array<Chunk>,
  size: number,
): Promise<Array<Chunk> | null> => {
  const { done, value } = await reader.read();
  if (done) {
    return chunks;
  }
  if (size + value.byteLength > limit) {
    await reader.cancel();
    return null;
  }
  chunks.push(value);
  return readUpTo(reader, limit, chunks, size + value.byteLength);
};

// Route handlers have no body limit, so the upload is capped before it is
// buffered: by its declared length first, then while it streams in.
const readLimitedForm = (request: Request) =>
  Effect.gen(function* () {
    const declared = Number(request.headers.get('content-length') ?? 0);
    if (declared > scanUploadByteLimit) {
      return yield* uploadTooLarge();
    }
    const invalidUpload = new ScanRequestError({
      message: 'Send the photos as a form upload.',
      status: badRequestStatus,
    });
    const { body } = request;
    if (!body) {
      return yield* invalidUpload;
    }
    const chunks = yield* Effect.tryPromise({
      try: () => readUpTo(body.getReader(), scanUploadByteLimit, [], 0),
      catch: () => invalidUpload,
    });
    if (!chunks) {
      return yield* uploadTooLarge();
    }
    return yield* Effect.tryPromise({
      try: () =>
        new Response(new Blob(chunks), {
          headers: {
            'content-type': request.headers.get('content-type') ?? '',
          },
        }).formData(),
      catch: () => invalidUpload,
    });
  });

/** Reads a multipart scan upload: `page` files plus the browser's AI settings. */
export const parseScanRequest = (request: Request) =>
  Effect.gen(function* () {
    const form = yield* readLimitedForm(request);
    const pages = yield* readPages(form);
    const week = readText(form, 'weekId');
    const weekId =
      week === undefined
        ? null
        : yield* Schema.decodeUnknownEffect(WeekId)(week).pipe(
            Effect.mapError(
              () =>
                new ScanRequestError({
                  message:
                    'Enter the week printed on the sheet, like 2026-W37.',
                  status: badRequestStatus,
                }),
            ),
          );
    const provider =
      readText(form, 'provider') === 'ollama' ? 'ollama' : 'google';
    return {
      pages,
      weekId,
      vision: {
        provider,
        googleApiKey: readText(form, 'googleApiKey'),
        ollamaEndpoint: readText(form, 'ollamaEndpoint'),
      },
    } satisfies ScanAnalysisInput;
  });
