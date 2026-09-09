import { Data } from 'effect';
export class ESCLError extends Data.TaggedError('ESCLError')<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}
export class ESCLCapabilitiesError extends Data.TaggedError(
  'ESCLCapabilitiesError',
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
