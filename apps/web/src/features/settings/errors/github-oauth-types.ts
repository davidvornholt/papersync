import { Data } from 'effect';
// biome-ignore lint/security/noSecrets: Stable Effect discriminator or diagnostic text, not a credential.
export class GitHubOAuthError extends Data.TaggedError('GitHubOAuthError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
export class GitHubAPIError extends Data.TaggedError('GitHubAPIError')<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}
// biome-ignore lint/security/noSecrets: Stable Effect discriminator or diagnostic text, not a credential.
export class GitHubAuthPending extends Data.TaggedError('GitHubAuthPending')<{
  readonly shouldRetry: true;
}> {}
// biome-ignore lint/security/noSecrets: Stable Effect discriminator or diagnostic text, not a credential.
export class GitHubSlowDown extends Data.TaggedError('GitHubSlowDown')<{
  readonly shouldRetry: true;
}> {}
