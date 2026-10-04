import { Config, Effect } from 'effect';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from './auth';

const unauthorizedStatus = 401;
const forbiddenStatus = 403;

const readSession = async () => {
  const requestHeaders = await headers();
  const auth = await Effect.runPromise(getAuth);
  return auth.api.getSession({ headers: requestHeaders });
};

export const requireSession = async () => {
  const session = await readSession();
  if (!session) {
    redirect('/login');
  }
  return session;
};

/**
 * JSON routes answer with an error instead of redirecting to the login page.
 * Requests that change state must also come from PaperSync's own origin.
 */
export const rejectUnauthorizedApiRequest = async (
  request: Request,
): Promise<Response | null> => {
  if (!(await readSession())) {
    return Response.json(
      { error: 'Your sign-in expired. Reload PaperSync and sign in again.' },
      { status: unauthorizedStatus },
    );
  }
  if (request.method === 'GET') {
    return null;
  }
  const publicUrl = await Effect.runPromise(Config.URL('BETTER_AUTH_URL'));
  return request.headers.get('origin') === publicUrl.origin
    ? null
    : Response.json(
        { error: 'Use PaperSync to change scans.' },
        { status: forbiddenStatus },
      );
};
