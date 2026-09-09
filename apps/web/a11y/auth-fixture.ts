import { symmetricEncodeJWT } from 'better-auth/crypto';
export const browserAuth = {
  baseUrl: 'http://127.0.0.1:3100',
  secret: 'papersync-public-test-secret-only-for-loopback-browser-tests',
  accountId: 'browser-test-account',
};
const sessionLifetimeSeconds = 3600;
const millisecondsPerSecond = 1000;
export const createSessionCookies = async (
  secret = browserAuth.secret,
  version = browserAuth.accountId,
) => {
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(
    now.valueOf() + sessionLifetimeSeconds * millisecondsPerSecond,
  );
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(token),
  );
  const signedToken = `${token}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
  const data = await symmetricEncodeJWT(
    {
      session: {
        id: 'test-session',
        token,
        userId: 'test-user',
        expiresAt,
        createdAt: now,
        updatedAt: now,
      },
      user: {
        id: 'test-user',
        name: 'Browser test',
        email: 'browser@example.test',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      updatedAt: now.valueOf(),
      version,
    },
    secret,
    'better-auth-session',
    sessionLifetimeSeconds,
  );
  return [
    {
      name: 'papersync.session_token',
      value: encodeURIComponent(signedToken),
      url: browserAuth.baseUrl,
    },
    { name: 'papersync.session_data', value: data, url: browserAuth.baseUrl },
  ];
};
