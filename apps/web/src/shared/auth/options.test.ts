import { expect, it } from 'bun:test';
import { betterAuth } from 'better-auth';
import { browserAuth, createSessionCookies } from '../../../a11y/auth-fixture';
import { createAuthOptions } from './options';

const options = createAuthOptions({
  baseUrl: browserAuth.baseUrl,
  secret: browserAuth.secret,
  clientId: 'test-client',
  clientSecret: 'test-client-secret',
  allowedAccountId: browserAuth.accountId,
});

it('GitHub sign-in admits only the configured account', () => {
  const gate = options.user.validateUserInfo;
  const allowed = {
    user: {},
    source: {
      action: 'sign-in' as const,
      method: 'oauth' as const,
      oauth: { providerId: 'github', profile: { id: browserAuth.accountId } },
    },
  };
  expect(gate(allowed)).toBeUndefined();
  expect(
    gate({
      user: {},
      source: {
        ...allowed.source,
        oauth: { providerId: 'github', profile: { id: 'another-account' } },
      },
    }),
  ).toEqual(expect.objectContaining({ error: 'account_not_allowed' }));
  expect(
    gate({
      user: {},
      source: {
        ...allowed.source,
        oauth: { providerId: 'google', profile: { id: browserAuth.accountId } },
      },
    }),
  ).toEqual(expect.objectContaining({ error: 'account_not_allowed' }));
});

it('session validation rejects missing, forged, and obsolete-account cookies', async () => {
  const auth = betterAuth(options);
  const valid = await createSessionCookies();
  const forged = await createSessionCookies(
    'a-different-public-test-secret-with-enough-length',
  );
  const obsolete = await createSessionCookies(
    browserAuth.secret,
    'previous-account',
  );
  const cookieHeader = (
    cookies: ReadonlyArray<{ readonly name: string; readonly value: string }>,
  ) =>
    new Headers({
      cookie: cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join('; '),
    });
  expect(
    (await auth.api.getSession({ headers: cookieHeader(valid) }))?.user.id,
  ).toBe('test-user');
  expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
  expect(
    await auth.api.getSession({ headers: cookieHeader(forged) }),
  ).toBeNull();
  expect(
    await auth.api.getSession({ headers: cookieHeader(obsolete) }),
  ).toBeNull();
});
