import { Context, Data, Effect, Layer } from "effect";
import { Octokit } from "octokit";

// ============================================================================
// Error Types
// ============================================================================

export class GitHubAuthError extends Data.TaggedError("GitHubAuthError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class GitHubAPIError extends Data.TaggedError("GitHubAPIError")<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}

// ============================================================================
// OAuth Device Flow Types
// ============================================================================

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

// ============================================================================
// GitHub Service Interface
// ============================================================================

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

export const GitHubService = Context.GenericTag<GitHubService>("GitHubService");

// ============================================================================
// Implementation
// ============================================================================

const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

const createGitHubService = (): GitHubService => ({
  initiateDeviceFlow: (clientId: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(GITHUB_DEVICE_CODE_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            scope: "repo",
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        return {
          deviceCode: data.device_code,
          userCode: data.user_code,
          verificationUri: data.verification_uri,
          expiresIn: data.expires_in,
          interval: data.interval,
        };
      },
      catch: (error) =>
        new GitHubAuthError({
          message: "Failed to initiate device flow",
          cause: error,
        }),
    }),

  pollForToken: (clientId: string, deviceCode: string, interval: number) =>
    Effect.async<OAuthTokenResponse, GitHubAuthError>((resume) => {
      const poll = async (): Promise<void> => {
        try {
          const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              client_id: clientId,
              device_code: deviceCode,
              grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            }),
          });

          const data = await response.json();

          if (data.error === "authorization_pending") {
            setTimeout(() => void poll(), interval * 1000);
            return;
          }

          if (data.error === "slow_down") {
            setTimeout(() => void poll(), (interval + 5) * 1000);
            return;
          }

          if (data.error) {
            resume(
              Effect.fail(
                new GitHubAuthError({
                  message: `OAuth error: ${data.error_description || data.error}`,
                }),
              ),
            );
            return;
          }

          resume(
            Effect.succeed({
              accessToken: data.access_token,
              tokenType: data.token_type,
              scope: data.scope,
            }),
          );
        } catch (error) {
          resume(
            Effect.fail(
              new GitHubAuthError({
                message: "Failed to poll for token",
                cause: error,
              }),
            ),
          );
        }
      };

      void poll();
    }),

  getFileContent: (
    token: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ) =>
    Effect.tryPromise({
      try: async () => {
        const octokit = new Octokit({ auth: token });

        try {
          const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref,
          });

          const data = response.data;
          if ("content" in data && typeof data.content === "string") {
            return Buffer.from(data.content, "base64").toString("utf-8");
          }
          return null;
        } catch (error) {
          if (
            error instanceof Error &&
            "status" in error &&
            error.status === 404
          ) {
            return null;
          }
          throw error;
        }
      },
      catch: (error) =>
        new GitHubAPIError({
          message: `Failed to get file: ${path}`,
          cause: error,
        }),
    }),

  createOrUpdateFile: (
    token: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
  ) =>
    Effect.tryPromise({
      try: async () => {
        const octokit = new Octokit({ auth: token });

        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString("base64"),
          sha,
        });
      },
      catch: (error) =>
        new GitHubAPIError({
          message: `Failed to update file: ${path}`,
          cause: error,
        }),
    }),

  listRepositories: (token: string) =>
    Effect.tryPromise({
      try: async () => {
        const octokit = new Octokit({ auth: token });

        const response = await octokit.rest.repos.listForAuthenticatedUser({
          sort: "updated",
          per_page: 100,
        });

        return response.data.map((repo) => ({
          name: repo.name,
          owner: repo.owner.login,
          fullName: repo.full_name,
        }));
      },
      catch: (error) =>
        new GitHubAPIError({
          message: "Failed to list repositories",
          cause: error,
        }),
    }),
});

// ============================================================================
// Layer
// ============================================================================

export const GitHubServiceLive: Layer.Layer<GitHubService, never, never> =
  Layer.succeed(GitHubService, createGitHubService());
