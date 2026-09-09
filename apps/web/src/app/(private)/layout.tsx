// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot resolve this conditional CommonJS export; TypeScript and the production build verify it.
import { type ReactNode, Suspense } from 'react';
import { signOut } from '@/shared/auth/login-action';
import { requireSession } from '@/shared/auth/session';

const PrivateContent = async ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  await requireSession();
  return (
    <>
      <form action={signOut} className="shell pt-4 text-right">
        <button type="submit" className="text-sm underline">
          Sign out
        </button>
      </form>
      {children}
    </>
  );
};
const PrivateLayout = ({ children }: { readonly children: ReactNode }) => (
  <Suspense fallback={<p className="shell page-shell">Checking sign-in…</p>}>
    <PrivateContent>{children}</PrivateContent>
  </Suspense>
);
export default PrivateLayout;
