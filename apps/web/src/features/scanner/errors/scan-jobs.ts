import { Data } from 'effect';
export class ScanRequestError extends Data.TaggedError('ScanRequestError')<{
  readonly message: string;
  readonly status: number;
}> {}
export class ScanJobNotFoundError extends Data.TaggedError(
  'ScanJobNotFoundError',
)<{
  readonly message: string;
}> {}
