import { Effect } from 'effect';
import { getAuth } from '@/shared/auth/auth';
export const GET = async (request: Request) => {
  const auth = await Effect.runPromise(getAuth);
  return auth.handler(request);
};
export const POST = async (request: Request) => {
  const auth = await Effect.runPromise(getAuth);
  return auth.handler(request);
};
