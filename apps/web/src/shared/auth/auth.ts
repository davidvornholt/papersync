import { betterAuth } from 'better-auth';
import { Config, Effect, Redacted } from 'effect';
import { createAuthOptions } from './options';
export const getAuth = Effect.runSync(
  Effect.cached(
    Effect.gen(function* () {
      const config = yield* Config.all({
        baseUrl: Config.URL('BETTER_AUTH_URL'),
        secret: Config.Redacted('BETTER_AUTH_SECRET'),
        clientId: Config.NonEmptyString('GITHUB_CLIENT_ID'),
        clientSecret: Config.Redacted('GITHUB_CLIENT_SECRET'),
        allowedAccountId: Config.NonEmptyString('GITHUB_ALLOWED_ACCOUNT_ID'),
      });
      return betterAuth(
        createAuthOptions({
          ...config,
          baseUrl: config.baseUrl.href,
          secret: Redacted.value(config.secret),
          clientSecret: Redacted.value(config.clientSecret),
        }),
      );
    }),
  ),
);
