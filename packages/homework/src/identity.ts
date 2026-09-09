import { Data, Effect } from 'effect';

const hexRadix = 16;
const byteWidth = 2;
const whitespacePattern = /\s+/gu;
export class IdentityError extends Data.TaggedError('IdentityError')<{
  readonly message: string;
  readonly cause: unknown;
}> {}
export const hashContent = (value: string) =>
  Effect.tryPromise({
    try: () => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    catch: (cause) =>
      new IdentityError({
        message: 'Cannot identify this homework. Retry saving it.',
        cause,
      }),
  }).pipe(
    Effect.map((hash) =>
      Array.from(new Uint8Array(hash), (byte) =>
        byte.toString(hexRadix).padStart(byteWidth, '0'),
      ).join(''),
    ),
  );
export const getHomeworkId = (
  week: string,
  day: string,
  subject: string,
  content: string,
) =>
  hashContent(
    JSON.stringify(
      [week, day, subject, content].map((part) =>
        part.trim().replace(whitespacePattern, ' '),
      ),
    ),
  );
export const getTaskMarker = (id: string) => `PaperSync: ${id}`;
