import { Data } from "effect";

/**
 * Types and Error Classes for GitHub OAuth Device Flow
 *
 * These are separated from the server actions file because
 * "use server" files can only export async functions.
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
// Result Types (for server action responses)
// ============================================================================

export type DeviceCodeResult =
  | ({ readonly success: true } & DeviceCodeResponse)
  | { readonly success: false; readonly error: string };

export type TokenPollResult =
  | ({ readonly success: true } & TokenResponse)
  | {
      readonly success: false;
      readonly error: string;
      readonly shouldRetry?: boolean;
    };

export type GitHubUserResult =
  | ({ readonly success: true } & GitHubUser)
  | { readonly success: false; readonly error: string };

export type GitHubReposResult =
  | {
      readonly success: true;
      readonly repositories: readonly GitHubRepository[];
    }
  | { readonly success: false; readonly error: string };
