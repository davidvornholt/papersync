import { Data } from 'effect';
export class QREncodeError extends Data.TaggedError('QREncodeError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
