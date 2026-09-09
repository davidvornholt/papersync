/**
 * Types and Error Classes for GitHub OAuth Device Flow
 *
 * These are separated from the server actions file because
 * "use server" files can only export async functions.
 */

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

export type DeviceCodeResult =
  | ({ readonly success: true } & DeviceCodeResponse)
  | { readonly success: false; readonly error: string };

export type TokenPollResult =
  | ({ readonly success: true } & TokenResponse)
  | {
      readonly success: false;
      readonly error: string;
      readonly shouldRetry: boolean;
      readonly isSlowDown: boolean;
    };

export type GitHubUserResult =
  | ({ readonly success: true } & GitHubUser)
  | { readonly success: false; readonly error: string };

export type GitHubReposResult =
  | {
      readonly success: true;
      readonly repositories: ReadonlyArray<GitHubRepository>;
    }
  | { readonly success: false; readonly error: string };
