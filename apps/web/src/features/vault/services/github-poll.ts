import { Effect } from 'effect';
import { GitHubAuthError, type OAuthTokenResponse } from './github-contract';

export const createPollForToken =
  (
    accessTokenUrl: string,
  ): ((
    clientId: string,
    deviceCode: string,
    interval: number,
  ) => Effect.Effect<OAuthTokenResponse, GitHubAuthError>) =>
  (clientId: string, deviceCode: string, interval: number) =>
    Effect.async<OAuthTokenResponse, GitHubAuthError>((resume) => {
      const poll = async (): Promise<void> => {
        try {
          const response = await fetch(accessTokenUrl, {
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
          });
          const data = await response.json();
          if (data.error === 'authorization_pending') {
            setTimeout(() => void poll(), interval * 1000);
            return;
          }
          if (data.error === 'slow_down') {
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
                message: 'Failed to poll for token',
                cause: error,
              }),
            ),
          );
        }
      };

      void poll();
    });
