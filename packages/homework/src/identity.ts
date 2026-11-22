import { Effect, Schema } from 'effect';

const hexRadix = 16;
const byteWidth = 2;
const whitespacePattern = /\s+/gu;
export class IdentityError extends Schema.TaggedError<IdentityError>()(
  'IdentityError',
  { message: Schema.String, cause: Schema.Defect() },
) {}
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
const hashParts = (parts: ReadonlyArray<string>) =>
  hashContent(
    JSON.stringify(
      parts.map((part) => part.trim().replace(whitespacePattern, ' ')),
    ),
  );
export const getHomeworkId = (
  week: string,
  day: string,
  subject: string,
  content: string,
) => hashParts([week, day, subject, content]);
// Identifies a line as a scan read it, whichever week it is saved in, so a
// corrected or unreadable week does not change it.
export const getReadingId = (day: string, subject: string, content: string) =>
  hashParts([day, subject, content]);
export const getTaskMarker = (id: string) => `PaperSync: ${id}`;
