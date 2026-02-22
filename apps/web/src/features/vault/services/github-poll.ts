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
      const poll = (): Promise<void> =>
        fetch(accessTokenUrl, {
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
        })
          .then(
            (response) => response.json() as Promise<Record<string, unknown>>,
          )
          .then((data) => {
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
                    message: `OAuth error: ${String(data.error_description ?? data.error)}`,
                  }),
                ),
              );
              return;
            }
            resume(
              Effect.succeed({
                accessToken: String(data.access_token),
                tokenType: String(data.token_type),
                scope: String(data.scope),
              }),
            );
          })
          .catch((error: unknown) => {
            resume(
              Effect.fail(
                new GitHubAuthError({
                  message: 'Failed to poll for token',
                  cause: error,
                }),
              ),
            );
          });

      void poll();
    });
