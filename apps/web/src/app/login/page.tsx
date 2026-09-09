// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot resolve this conditional CommonJS export; TypeScript and the production build verify it.
import { Suspense } from 'react';
import { signIn } from '@/shared/auth/login-action';

type LoginPageProps = {
  readonly searchParams: Promise<{ readonly error?: string }>;
};
const LoginForm = async ({ searchParams }: LoginPageProps) => {
  const { error } = await searchParams;
  return (
    <div className="shell page-shell max-w-xl">
      <p className="mono-tag">PaperSync</p>
      <h1 className="mt-4 text-4xl">Your homework, ready for home.</h1>
      <p className="my-6 text-ink-soft">
        Sign in to scan your paper planner and send approved homework to Super
        Productivity. This instance is private.
      </p>
      {error ? (
        <p role="alert" className="mb-4 border border-hairline p-3">
          Sign-in was unsuccessful. Use the GitHub account allowed for this
          PaperSync instance, then try again.
        </p>
      ) : null}
      <form action={signIn}>
        <button type="submit" className="btn-ink btn-md">
          Sign in with GitHub
        </button>
      </form>
    </div>
  );
};
const LoginPage = (props: LoginPageProps) => (
  <Suspense fallback={<p className="shell page-shell">Loading sign-in…</p>}>
    <LoginForm {...props} />
  </Suspense>
);
export default LoginPage;
