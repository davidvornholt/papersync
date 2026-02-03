"use server";

import { Data, Effect } from "effect";

/**
 * Server Actions for GitHub OAuth Device Flow
 *
 * GitHub's OAuth endpoints don't support CORS, so they must be called
 * from the server-side rather than directly from the browser.
 */

// ============================================================================
// Error Types
// ============================================================================

export class GitHubOAuthError extends Data.TaggedError("GitHubOAuthError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class GitHubAPIError extends Data.TaggedError("GitHubAPIError")<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}

export class GitHubAuthPending extends Data.TaggedError("GitHubAuthPending")<{
  readonly shouldRetry: true;
}> {}

export class GitHubSlowDown extends Data.TaggedError("GitHubSlowDown")<{
  readonly shouldRetry: true;
}> {}

// ============================================================================
// Success Types
// ============================================================================

export type DeviceCodeResponse = {
  readonly deviceCode: string;
  readonly userCode: string;
  readonly verificationUri: string;
  readonly expiresIn: number;
  readonly interval: number;
};

export type TokenResponse = {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly scope: string;
};

export type GitHubUser = {
  readonly login: string;
  readonly name: string | null;
  readonly avatarUrl: string;
};

export type GitHubRepository = {
  readonly id: number;
  readonly name: string;
  readonly fullName: string;
  readonly owner: string;
  readonly private: boolean;
  readonly description: string | null;
};

// ============================================================================
// Effect-Based Implementations
// ============================================================================

const initiateDeviceFlowEffect = (
  clientId: string,
): Effect.Effect<DeviceCodeResponse, GitHubOAuthError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch("https://github.com/login/device/code", {
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
        const errorText = await response.text();
        throw new Error(`GitHub returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      return {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        expiresIn: data.expires_in,
        interval: data.interval,
      };
    },
    catch: (error) =>
      new GitHubOAuthError({
        message:
          error instanceof Error
            ? error.message
            : "Failed to initiate device flow",
        cause: error,
      }),
  });

const pollTokenEffect = (
  clientId: string,
  deviceCode: string,
): Effect.Effect<
  TokenResponse,
  GitHubOAuthError | GitHubAuthPending | GitHubSlowDown
> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(
        "https://github.com/login/oauth/access_token",
        {
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
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub returned ${response.status}`);
      }

      const data = await response.json();

      if (data.error === "authorization_pending") {
        throw { _tag: "pending" };
      }

      if (data.error === "slow_down") {
        throw { _tag: "slow_down" };
      }

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (!data.access_token) {
        throw new Error("No access token in response");
      }

      return {
        accessToken: data.access_token,
        tokenType: data.token_type,
        scope: data.scope,
      };
    },
    catch: (error) => {
      if (typeof error === "object" && error !== null && "_tag" in error) {
        if (error._tag === "pending") {
          return new GitHubAuthPending({ shouldRetry: true });
        }
        if (error._tag === "slow_down") {
          return new GitHubSlowDown({ shouldRetry: true });
        }
      }
      return new GitHubOAuthError({
        message:
          error instanceof Error ? error.message : "Failed to poll for token",
        cause: error,
      });
    },
  });

const getGitHubUserEffect = (
  accessToken: string,
): Effect.Effect<GitHubUser, GitHubAPIError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!response.ok) {
        throw { status: response.status };
      }

      const data = await response.json();

      return {
        login: data.login,
        name: data.name,
        avatarUrl: data.avatar_url,
      };
    },
    catch: (error) =>
      new GitHubAPIError({
        message:
          typeof error === "object" && error !== null && "status" in error
            ? `GitHub API returned ${error.status}`
            : error instanceof Error
              ? error.message
              : "Failed to fetch GitHub user",
        status:
          typeof error === "object" && error !== null && "status" in error
            ? (error.status as number)
            : undefined,
        cause: error,
      }),
  });

const listRepositoriesEffect = (
  accessToken: string,
): Effect.Effect<readonly GitHubRepository[], GitHubAPIError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(
        "https://api.github.com/user/repos?sort=updated&per_page=100",
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${accessToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );

      if (!response.ok) {
        throw { status: response.status };
      }

      const data = await response.json();

      return data.map(
        (repo: {
          id: number;
          name: string;
          full_name: string;
          owner: { login: string };
          private: boolean;
          description: string | null;
        }) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          private: repo.private,
          description: repo.description,
        }),
      );
    },
    catch: (error) =>
      new GitHubAPIError({
        message:
          typeof error === "object" && error !== null && "status" in error
            ? `GitHub API returned ${error.status}`
            : error instanceof Error
              ? error.message
              : "Failed to list repositories",
        status:
          typeof error === "object" && error !== null && "status" in error
            ? (error.status as number)
            : undefined,
        cause: error,
      }),
  });

// ============================================================================
// Server Actions (Public API - runs Effect at boundary)
// ============================================================================

export type DeviceCodeResult =
  | ({ readonly success: true } & DeviceCodeResponse)
  | { readonly success: false; readonly error: string };

export const initiateGitHubDeviceFlow = async (
  clientId: string,
): Promise<DeviceCodeResult> =>
  Effect.runPromise(
    initiateDeviceFlowEffect(clientId).pipe(
      Effect.map((response) => ({ success: true as const, ...response })),
      Effect.catchAll((error) =>
        Effect.succeed({ success: false as const, error: error.message }),
      ),
    ),
  );

export type TokenPollResult =
  | ({ readonly success: true } & TokenResponse)
  | {
      readonly success: false;
      readonly error: string;
      readonly shouldRetry?: boolean;
    };

export const pollGitHubToken = async (
  clientId: string,
  deviceCode: string,
): Promise<TokenPollResult> =>
  Effect.runPromise(
    pollTokenEffect(clientId, deviceCode).pipe(
      Effect.map((response) => ({ success: true as const, ...response })),
      Effect.catchAll((error) => {
        if (error._tag === "GitHubAuthPending") {
          return Effect.succeed({
            success: false as const,
            error: "Authorization pending",
            shouldRetry: true,
          });
        }
        if (error._tag === "GitHubSlowDown") {
          return Effect.succeed({
            success: false as const,
            error: "Slow down - polling too fast",
            shouldRetry: true,
          });
        }
        return Effect.succeed({
          success: false as const,
          error: error.message,
          shouldRetry: false,
        });
      }),
    ),
  );

export type GitHubUserResult =
  | ({ readonly success: true } & GitHubUser)
  | { readonly success: false; readonly error: string };

export const getGitHubUser = async (
  accessToken: string,
): Promise<GitHubUserResult> =>
  Effect.runPromise(
    getGitHubUserEffect(accessToken).pipe(
      Effect.map((user) => ({ success: true as const, ...user })),
      Effect.catchAll((error) =>
        Effect.succeed({ success: false as const, error: error.message }),
      ),
    ),
  );

export type GitHubReposResult =
  | {
      readonly success: true;
      readonly repositories: readonly GitHubRepository[];
    }
  | { readonly success: false; readonly error: string };

export const listGitHubRepositories = async (
  accessToken: string,
): Promise<GitHubReposResult> =>
  Effect.runPromise(
    listRepositoriesEffect(accessToken).pipe(
      Effect.map((repositories) => ({ success: true as const, repositories })),
      Effect.catchAll((error) =>
        Effect.succeed({ success: false as const, error: error.message }),
      ),
    ),
  );
