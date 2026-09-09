import { Data } from 'effect';
export class RequestValidationError extends Data.TaggedError(
  'RequestValidationError',
)<{
  readonly message: string;
  readonly status: number;
}> {}
export class PdfGenerationError extends Data.TaggedError('PdfGenerationError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
