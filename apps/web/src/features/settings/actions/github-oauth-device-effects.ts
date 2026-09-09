import { Effect, Schema } from 'effect';
import {
  GitHubAuthPending,
  GitHubOAuthError,
  GitHubSlowDown,
} from '@/features/settings/errors/github-oauth-types';
import { fetchJson } from '@/shared/http/json';

const deviceSchema = Schema.Struct({
  // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
  device_code: Schema.NonEmptyString,
  // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
  user_code: Schema.NonEmptyString,
  // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
  verification_uri: Schema.NonEmptyString,
  // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
  expires_in: Schema.Positive,
  interval: Schema.Positive,
});
const tokenSchema = Schema.Struct({
  // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
  access_token: Schema.NonEmptyString,
  // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
  token_type: Schema.String,
  scope: Schema.String,
});
const errorSchema = Schema.Struct({ error: Schema.String });
const post = (path: string, body: Readonly<Record<string, string>>) =>
  fetchJson(`https://github.com/login/${path}`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).pipe(
    Effect.mapError(
      (cause) => new GitHubOAuthError({ message: cause.message, cause }),
    ),
  );
export const initiateDeviceFlowEffect = (clientId: string) =>
  // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
  post('device/code', { client_id: clientId, scope: 'repo' }).pipe(
    Effect.flatMap(Schema.decodeUnknown(deviceSchema)),
    Effect.map((data) => ({
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      expiresIn: data.expires_in,
      interval: data.interval,
    })),
    Effect.mapError(
      (cause) =>
        new GitHubOAuthError({
          message:
            'Could not start GitHub authorization. Check the client ID and try again.',
          cause,
        }),
    ),
  );
export const pollTokenEffect = (clientId: string, deviceCode: string) =>
  Effect.gen(function* () {
    const data = yield* post('oauth/access_token', {
      // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
      client_id: clientId,
      // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
      device_code: deviceCode,
      // biome-ignore lint/style/useNamingConvention: GitHub wire-format field required by the API.
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
    if (Schema.is(errorSchema)(data)) {
      if (data.error === 'authorization_pending') {
        return yield* Effect.fail(new GitHubAuthPending({ shouldRetry: true }));
      }
      if (data.error === 'slow_down') {
        return yield* Effect.fail(new GitHubSlowDown({ shouldRetry: true }));
      }
      return yield* Effect.fail(
        new GitHubOAuthError({
          message: `GitHub authorization failed: ${data.error}. Start authorization again.`,
        }),
      );
    }
    const token = yield* Schema.decodeUnknown(tokenSchema)(data).pipe(
      Effect.mapError(
        (cause) =>
          new GitHubOAuthError({
            message:
              'GitHub returned an invalid token response. Start authorization again.',
            cause,
          }),
      ),
    );
    return {
      accessToken: token.access_token,
      tokenType: token.token_type,
      scope: token.scope,
    };
  });
