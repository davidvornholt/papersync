'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './navigation-config';

export const DesktopTopNav = (): React.ReactElement => {
  const pathname = usePathname();

  return (
    <header className="hidden md:block fixed top-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-b border-border z-30">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display text-xl font-semibold text-foreground">
            PaperSync
          </span>
        </Link>

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

export const MobileBottomNav = (): React.ReactElement => {
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
