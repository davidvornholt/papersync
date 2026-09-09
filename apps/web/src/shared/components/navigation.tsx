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
    <main className="min-h-screen pb-16 md:pt-16 md:pb-0">{children}</main>
  </div>
);
