import { Data } from 'effect';
export class VisionError extends Data.TaggedError('VisionError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
export class VisionValidationError extends Data.TaggedError(
  'VisionValidationError',
)<{
  readonly message: string;
  readonly raw?: string;
}> {}
