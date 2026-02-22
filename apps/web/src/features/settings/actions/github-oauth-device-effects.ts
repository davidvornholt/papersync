import { Effect } from 'effect';
import {
  type DeviceCodeResponse,
  GitHubAuthPending,
  GitHubOAuthError,
  GitHubSlowDown,
  type TokenResponse,
} from './github-oauth-types';

export const initiateDeviceFlowEffect = (
  clientId: string,
): Effect.Effect<DeviceCodeResponse, GitHubOAuthError> =>
  Effect.tryPromise({
    try: () =>
      fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: clientId, scope: 'repo' }),
      }).then((response) => {
        if (!response.ok) {
          return response
            .text()
            .then((errorText) =>
              Promise.reject(
                new Error(`GitHub returned ${response.status}: ${errorText}`),
              ),
            );
        }

        return response.json().then((data) => {
          if (data.error) {
            return Promise.reject(
              new Error(data.error_description || data.error),
            );
          }

          return {
            deviceCode: data.device_code,
            userCode: data.user_code,
            verificationUri: data.verification_uri,
            expiresIn: data.expires_in,
            interval: data.interval,
          };
        });
      }),
    catch: (error) =>
      new GitHubOAuthError({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to initiate device flow',
        cause: error,
      }),
  });

export const pollTokenEffect = (
  clientId: string,
  deviceCode: string,
): Effect.Effect<
  TokenResponse,
  GitHubOAuthError | GitHubAuthPending | GitHubSlowDown
> =>
  Effect.tryPromise({
    try: () =>
      fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      }).then((response) => {
        if (!response.ok) {
          return Promise.reject(
            new Error(`GitHub returned ${response.status}`),
          );
        }

        return response.json().then((data) => {
          if (data.error === 'authorization_pending') {
            return Promise.reject({ _tag: 'pending' });
          }
          if (data.error === 'slow_down') {
            return Promise.reject({ _tag: 'slow_down' });
          }
          if (data.error) {
            return Promise.reject(
              new Error(data.error_description || data.error),
            );
          }
          if (!data.access_token) {
            return Promise.reject(new Error('No access token in response'));
          }

          return {
            accessToken: data.access_token,
            tokenType: data.token_type,
            scope: data.scope,
          };
        });
      }),
    catch: (error) => {
      if (typeof error === 'object' && error !== null && '_tag' in error) {
        if (error._tag === 'pending') {
          return new GitHubAuthPending({ shouldRetry: true });
        }
        if (error._tag === 'slow_down') {
          return new GitHubSlowDown({ shouldRetry: true });
        }
      }
      return new GitHubOAuthError({
        message:
          error instanceof Error ? error.message : 'Failed to poll for token',
        cause: error,
      });
    },
  });
