import { Data } from 'effect';
export class SyncValidationError extends Data.TaggedError(
  'SyncValidationError',
)<{
  readonly message: string;
}> {}
// biome-ignore lint/security/noSecrets: Stable Effect discriminator or diagnostic text, not a credential.
export class GitHubFileError extends Data.TaggedError('GitHubFileError')<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}
// biome-ignore lint/security/noSecrets: Stable Effect discriminator or diagnostic text, not a credential.
export class GitHubFileNotFound extends Data.TaggedError('GitHubFileNotFound')<{
  readonly path: string;
}> {}
