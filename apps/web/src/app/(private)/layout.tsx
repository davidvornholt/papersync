import { LogOut } from 'lucide-react';
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
      {children}
      <footer className="shell mt-8 border-hairline border-t py-6">
        <div className="flex items-center justify-between gap-4">
          <span className="serif text-lg">PaperSync</span>
          <form action={signOut}>
            <button type="submit" className="btn-ghost btn-sm">
              <LogOut size={16} aria-hidden={true} />
              Sign out
            </button>
          </form>
        </div>
      </footer>
    </>
  );
};
const PrivateLayout = ({ children }: { readonly children: ReactNode }) => (
  <Suspense fallback={<p className="shell page-shell">Checking sign-in…</p>}>
    <PrivateContent>{children}</PrivateContent>
  </Suspense>
);
export default PrivateLayout;
