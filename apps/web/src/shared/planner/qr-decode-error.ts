import { Data } from 'effect';
export class QRDecodeError extends Data.TaggedError('QRDecodeError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
