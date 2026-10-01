import { Data } from 'effect';
export class ScanPageError extends Data.TaggedError('ScanPageError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
export class ScanJobRequestError extends Data.TaggedError(
  // biome-ignore lint/security/noSecrets: Stable Effect discriminator or diagnostic text, not a credential.
  'ScanJobRequestError',
)<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}
export class ScanJobMissingError extends Data.TaggedError(
  'ScanJobMissingError',
)<{
  readonly message: string;
}> {}
export class ScanDraftStoreError extends Data.TaggedError(
  'ScanDraftStoreError',
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
