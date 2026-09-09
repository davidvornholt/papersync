import { Effect } from 'effect';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from './auth';
export const requireSession = async () => {
  const requestHeaders = await headers();
  const auth = await Effect.runPromise(getAuth);
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    redirect('/login');
  }
  return session;
};
