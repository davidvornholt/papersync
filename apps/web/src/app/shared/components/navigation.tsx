'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ============================================================================
// Navigation Icons
// ============================================================================

const HomeIcon = ({
  className,
}: {
  readonly className?: string;
}): React.ReactElement => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <title>Home</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

const PlannerIcon = ({
  className,
}: {
  readonly className?: string;
}): React.ReactElement => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <title>Planner</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const ScanIcon = ({
  className,
}: {
  readonly className?: string;
}): React.ReactElement => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <title>Scan</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const SettingsIcon = ({
  className,
}: {
  readonly className?: string;
}): React.ReactElement => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <title>Settings</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// ============================================================================
// Navigation Items
// ============================================================================

type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ComponentType<{ readonly className?: string }>;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/planner', label: 'Planner', icon: PlannerIcon },
  { href: '/scan', label: 'Scan', icon: ScanIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

// ============================================================================
// Desktop Sidebar
// ============================================================================

const DesktopTopNav = (): React.ReactElement => {
  const pathname = usePathname();

  return (
    <header className="hidden md:block fixed top-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-b border-border z-30">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display text-xl font-semibold text-foreground">
            PaperSync
          </span>
        </Link>

        {/* Navigation */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <motion.div
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-accent text-white shadow-md shadow-accent/20'
                          : 'text-muted hover:text-foreground hover:bg-background'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </motion.div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
};

// ============================================================================
// Mobile Bottom Navigation
// ============================================================================

const MobileBottomNav = (): React.ReactElement => {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-border z-40 safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <ul className="flex justify-around items-center h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="flex flex-col items-center justify-center py-2 min-h-[56px] touch-manipulation"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="relative flex flex-col items-center"
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute -top-1 w-12 h-12 rounded-2xl bg-accent/10"
                      transition={{
                        type: 'spring',
                        damping: 25,
                        stiffness: 300,
                      }}
                    />
                  )}
                  <Icon
                    className={`w-6 h-6 relative z-10 transition-colors ${
                      isActive ? 'text-accent' : 'text-muted'
                    }`}
                  />
                  <span
                    className={`text-xs mt-1 relative z-10 font-medium transition-colors ${
                      isActive ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

// ============================================================================
// Main Navigation Export
// ============================================================================

export const Navigation = (): React.ReactElement => (
  <>
    <DesktopTopNav />
    <MobileBottomNav />
  </>
);

// ============================================================================
// Main Layout Wrapper
// ============================================================================

type MainLayoutProps = {
  readonly children: React.ReactNode;
};

export const MainLayout = ({
  children,
}: MainLayoutProps): React.ReactElement => (
  <div className="min-h-screen bg-background">
    <Navigation />
    {/* Main content with responsive padding for nav */}
    <main className="md:pt-16 pb-20 md:pb-0 min-h-screen">{children}</main>
  </div>
);
