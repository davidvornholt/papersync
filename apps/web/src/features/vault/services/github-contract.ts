import { Context, Data, type Effect } from 'effect';

export class GitHubAuthError extends Data.TaggedError('GitHubAuthError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class GitHubAPIError extends Data.TaggedError('GitHubAPIError')<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}

export type DeviceCodeResponse = {
  readonly deviceCode: string;
  readonly userCode: string;
  readonly verificationUri: string;
  readonly expiresIn: number;
  readonly interval: number;
};

export type OAuthTokenResponse = {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly scope: string;
};

export type GitHubService = {
  readonly initiateDeviceFlow: (
    clientId: string,
  ) => Effect.Effect<DeviceCodeResponse, GitHubAuthError>;
  readonly pollForToken: (
    clientId: string,
    deviceCode: string,
    interval: number,
  ) => Effect.Effect<OAuthTokenResponse, GitHubAuthError>;
  readonly getFileContent: (
    token: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ) => Effect.Effect<string | null, GitHubAPIError>;
  readonly createOrUpdateFile: (
    token: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
  ) => Effect.Effect<void, GitHubAPIError>;
  readonly listRepositories: (
    token: string,
  ) => Effect.Effect<
    ReadonlyArray<{ name: string; owner: string; fullName: string }>,
    GitHubAPIError
  >;
};

export const GitHubService = Context.GenericTag<GitHubService>('GitHubService');
