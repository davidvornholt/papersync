import { Data } from 'effect';
export class SyncSettingsValidationError extends Data.TaggedError(
  'SyncSettingsValidationError',
)<{
  readonly message: string;
}> {}
// biome-ignore lint/security/noSecrets: Stable Effect discriminator or diagnostic text, not a credential.
export class GitHubSyncError extends Data.TaggedError('GitHubSyncError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
