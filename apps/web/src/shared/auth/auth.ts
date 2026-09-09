import { betterAuth } from 'better-auth';
import { Config, Effect, Redacted } from 'effect';
import { createAuthOptions } from './options';
export const getAuth = Effect.runSync(
  Effect.cached(
    Effect.gen(function* () {
      const config = yield* Config.all({
        baseUrl: Config.url('BETTER_AUTH_URL'),
        secret: Config.redacted('BETTER_AUTH_SECRET'),
        clientId: Config.nonEmptyString('GITHUB_CLIENT_ID'),
        clientSecret: Config.redacted('GITHUB_CLIENT_SECRET'),
        allowedAccountId: Config.nonEmptyString('GITHUB_ALLOWED_ACCOUNT_ID'),
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
