import type { BetterAuthOptions, ValidateUserInfoSource } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
export type AuthConfiguration = {
  readonly baseUrl: string;
  readonly secret: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly allowedAccountId: string;
};

export const isAllowedAccount = (
  source: ValidateUserInfoSource,
  allowedAccountId: string,
): boolean => {
  if (source.method !== 'oauth' || source.oauth?.providerId !== 'github') {
    return false;
  }
  const accountId = source.oauth.profile?.id;
  return (
    (typeof accountId === 'number' || typeof accountId === 'string') &&
    String(accountId) === allowedAccountId
  );
};

export const createAuthOptions = (config: AuthConfiguration) =>
  ({
    baseURL: config.baseUrl,
    secret: config.secret,
    socialProviders: {
      github: { clientId: config.clientId, clientSecret: config.clientSecret },
    },
    user: {
      validateUserInfo: ({ source }) =>
        isAllowedAccount(source, config.allowedAccountId)
          ? undefined
          : {
              error: 'account_not_allowed',
              errorDescription: 'PaperSync is private.',
            },
    },
    session: {
      cookieCache: { strategy: 'jwe', version: config.allowedAccountId },
    },
    advanced: { cookiePrefix: 'papersync' },
    plugins: [nextCookies()],
  }) satisfies BetterAuthOptions;
