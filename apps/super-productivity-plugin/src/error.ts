import { Data } from 'effect';
export class ImportError extends Data.TaggedError('ImportError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
