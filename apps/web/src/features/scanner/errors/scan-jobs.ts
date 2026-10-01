import { Data } from 'effect';
export class ScanRequestError extends Data.TaggedError('ScanRequestError')<{
  readonly message: string;
  readonly status: number;
}> {}
export class ScanJobNotFoundError extends Data.TaggedError(
  // biome-ignore lint/security/noSecrets: Stable Effect discriminator or diagnostic text, not a credential.
  'ScanJobNotFoundError',
)<{
  readonly message: string;
}> {}
