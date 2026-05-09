'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './navigation-config';

const isItemActive = (
  pathname: string,
  href: string,
  exact: boolean | undefined,
): boolean => (exact ? pathname === href : pathname.startsWith(href));

export const DesktopTopNav = (): React.ReactElement => {
  const pathname = usePathname();

  return (
    <header className="hidden md:block fixed top-0 inset-x-0 z-30 bg-paper/80 backdrop-blur-xl border-b border-hairline">
      <div className="shell h-16 flex items-center justify-between">
        <Link
          href="/"
          className="serif text-[22px] tracking-[-0.035em] text-ink"
          aria-label="PaperSync home"
        >
          Paper<span className="serif-italic ink">Sync</span>
        </Link>

        <nav aria-label="Primary">
          <ul className="flex items-center gap-10">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(pathname, item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group relative inline-flex flex-col items-center"
                  >
                    <span
                      className={`text-[13px] tracking-[-0.005em] transition-colors duration-200 ${
                        active
                          ? 'text-ink'
                          : 'text-graphite group-hover:text-ink'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span
                      aria-hidden
                      className={`absolute -bottom-[6px] h-px bg-accent transition-all duration-300 ${
                        active
                          ? 'w-full opacity-100'
                          : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-60'
                      }`}
                    />
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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur-xl border-t border-hairline safe-area-bottom"
      aria-label="Mobile primary"
    >
      <ul className="flex justify-around items-stretch h-14 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(pathname, item.href, item.exact);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="relative h-full flex items-center justify-center touch-manipulation"
              >
                <span
                  className={`text-[12px] tracking-[-0.005em] transition-colors duration-200 ${
                    active ? 'text-ink' : 'text-graphite'
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-10 bg-accent"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
