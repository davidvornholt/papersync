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
    <header className="fixed inset-x-0 top-0 z-30 hidden border-hairline border-b bg-paper/80 backdrop-blur-xl md:block">
      <div className="shell flex h-16 items-center justify-between">
        <Link
          href="/"
          className="serif text-[22px] text-ink tracking-[-0.035em]"
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
                      aria-hidden={true}
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
      className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-hairline border-t bg-paper/95 backdrop-blur-xl md:hidden"
      aria-label="Mobile primary"
    >
      <ul className="flex h-14 items-stretch justify-around px-3">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(pathname, item.href, item.exact);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="relative flex h-full touch-manipulation items-center justify-center"
              >
                <span
                  className={`text-[12px] tracking-[-0.005em] transition-colors duration-200 ${
                    active ? 'text-ink' : 'text-graphite'
                  }`}
                >
                  {item.label}
                </span>
                {active ? (
                  <span
                    aria-hidden={true}
                    className="absolute top-0 left-1/2 h-px w-10 -translate-x-1/2 bg-accent"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
