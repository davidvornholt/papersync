'use server';

import { Effect } from 'effect';
import {
  getGitHubUserEffect,
  listRepositoriesEffect,
} from './github-oauth-api-effects';
import {
  initiateDeviceFlowEffect,
  pollTokenEffect,
} from './github-oauth-device-effects';
import type {
  DeviceCodeResult,
  GitHubReposResult,
  GitHubUserResult,
  TokenPollResult,
} from './github-oauth-types';

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

export const pollGitHubToken = async (
  clientId: string,
  deviceCode: string,
): Promise<TokenPollResult> =>
  Effect.runPromise(
    pollTokenEffect(clientId, deviceCode).pipe(
      Effect.map((response) => ({ success: true as const, ...response })),
      Effect.catchAll((error) => {
        if (error._tag === 'GitHubAuthPending') {
          return Effect.succeed({
            success: false as const,
            error: 'Authorization pending',
            shouldRetry: true,
          });
        }
        if (error._tag === 'GitHubSlowDown') {
          return Effect.succeed({
            success: false as const,
            error: 'Slow down - polling too fast',
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
