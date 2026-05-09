export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly exact?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Manifesto', exact: true },
  { href: '/scan', label: 'Scan' },
  { href: '/planner', label: 'Planner' },
  { href: '/settings', label: 'Settings' },
];
