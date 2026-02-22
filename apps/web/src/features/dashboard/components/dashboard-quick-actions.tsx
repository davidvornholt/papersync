'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Card,
  HoverScale,
  StaggerContainer,
  StaggerItem,
} from '@/shared/components';

type QuickActionItem = {
  readonly href: string;
  readonly title: string;
  readonly description: string;
  readonly gradient: string;
  readonly iconPath: string;
  readonly secondaryIconPath?: string;
};

const QUICK_ACTIONS: readonly QuickActionItem[] = [
  {
    href: '/planner',
    title: 'Generate Planner',
    description: 'Create a weekly PDF',
    gradient: 'bg-gradient-to-br from-accent/5 to-transparent',
    iconPath:
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    href: '/scan',
    title: 'Scan & Sync',
    description: 'Import handwritten notes',
    gradient: 'bg-gradient-to-br from-blue-500/5 to-transparent',
    iconPath:
      'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
    secondaryIconPath: 'M15 13a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    href: '/settings',
    title: 'Settings',
    description: 'Configure vault & sync',
    gradient: 'bg-gradient-to-br from-purple-500/5 to-transparent',
    iconPath:
      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    secondaryIconPath: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

const QuickActionCard = ({
  action,
}: {
  readonly action: QuickActionItem;
}): React.ReactElement => (
  <Link href={action.href}>
    <HoverScale>
      <Card
        elevated
        className="relative overflow-hidden cursor-pointer group h-full"
      >
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${action.gradient}`}
        />
        <div className="relative p-6">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-300"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>{action.title}</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={action.iconPath}
                />
                {action.secondaryIconPath && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={action.secondaryIconPath}
                  />
                )}
              </svg>
            </motion.div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-muted mt-0.5">{action.description}</p>
            </div>
          </div>
        </div>
      </Card>
    </HoverScale>
  </Link>
);

export const DashboardQuickActions = (): React.ReactElement => (
  <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {QUICK_ACTIONS.map((action) => (
      <StaggerItem key={action.href}>
        <QuickActionCard action={action} />
      </StaggerItem>
    ))}
  </StaggerContainer>
);
