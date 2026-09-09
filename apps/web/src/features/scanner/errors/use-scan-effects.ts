import { Data } from 'effect';
export class FileReadError extends Data.TaggedError('FileReadError')<{
  readonly message: string;
}> {}
export class ExtractionRequestError extends Data.TaggedError(
  'ExtractionRequestError',
)<{
  readonly message: string;
  readonly cause: unknown;
}> {}
