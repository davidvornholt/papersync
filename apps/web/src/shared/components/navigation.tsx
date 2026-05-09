'use client';

import { DesktopTopNav, MobileBottomNav } from './navigation-sections';

export const Navigation = (): React.ReactElement => (
  <>
    <DesktopTopNav />
    <MobileBottomNav />
  </>
);

type MainLayoutProps = {
  readonly children: React.ReactNode;
};

export const MainLayout = ({
  children,
}: MainLayoutProps): React.ReactElement => (
  <div className="min-h-screen bg-paper text-ink">
    <Navigation />
    <main className="md:pt-16 pb-16 md:pb-0 min-h-screen">{children}</main>
  </div>
);
