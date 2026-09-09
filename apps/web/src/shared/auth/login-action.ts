'use server';

import { Effect } from 'effect';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from './auth';
export const signIn = async () => {
  const auth = await Effect.runPromise(getAuth);
  const result = await auth.api.signInSocial({
    headers: await headers(),
    body: {
      provider: 'github',
      callbackURL: '/scan',
      errorCallbackURL: '/login?error=sign_in_failed',
    },
  });
  if (result.url) {
    redirect(result.url);
  }
  redirect('/login?error=sign_in_failed');
};

export const signOut = async () => {
  const auth = await Effect.runPromise(getAuth);
  await auth.api.signOut({ headers: await headers() });
  redirect('/login');
};
