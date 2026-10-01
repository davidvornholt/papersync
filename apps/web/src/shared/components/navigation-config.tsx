export type NavItem = {
  readonly href: string;
  readonly label: string;
};

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/scan', label: 'Scan' },
  { href: '/planner', label: 'Planner' },
  { href: '/settings', label: 'Settings' },
];
