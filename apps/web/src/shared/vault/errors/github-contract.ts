import { Data } from 'effect';
// biome-ignore lint/security/noSecrets: Stable Effect discriminator or diagnostic text, not a credential.
export class GitHubAuthError extends Data.TaggedError('GitHubAuthError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
export class GitHubAPIError extends Data.TaggedError('GitHubAPIError')<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}
