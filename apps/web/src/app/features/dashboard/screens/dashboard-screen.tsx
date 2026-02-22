'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  HoverScale,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from '@/app/shared/components';

// ============================================================================
// Icons
// ============================================================================

const CheckIcon = (): React.ReactElement => (
  <svg
    className="w-5 h-5 text-accent"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <title>Check</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

// ============================================================================
// Quick Action Card
// ============================================================================

type QuickActionProps = {
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
  readonly gradient: string;
};

const QuickAction = ({
  href,
  icon,
  title,
  description,
  gradient,
}: QuickActionProps): React.ReactElement => (
  <Link href={href}>
    <HoverScale>
      <Card
        elevated
        className="relative overflow-hidden cursor-pointer group h-full"
      >
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient}`}
        />
        <div className="relative p-6">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-300"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              {icon}
            </motion.div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted mt-0.5">{description}</p>
            </div>
          </div>
        </div>
      </Card>
    </HoverScale>
  </Link>
);

// ============================================================================
// Quick Actions Component
// ============================================================================

const QuickActions = (): React.ReactElement => (
  <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <StaggerItem>
      <QuickAction
        href="/planner"
        gradient="bg-gradient-to-br from-accent/5 to-transparent"
        icon={
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Generate Planner</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        title="Generate Planner"
        description="Create a weekly PDF"
      />
    </StaggerItem>

    <StaggerItem>
      <QuickAction
        href="/scan"
        gradient="bg-gradient-to-br from-blue-500/5 to-transparent"
        icon={
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Scan &amp; Sync</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
        title="Scan & Sync"
        description="Import handwritten notes"
      />
    </StaggerItem>

    <StaggerItem>
      <QuickAction
        href="/settings"
        gradient="bg-gradient-to-br from-purple-500/5 to-transparent"
        icon={
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Settings</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
        title="Settings"
        description="Configure vault & sync"
      />
    </StaggerItem>
  </StaggerContainer>
);

// ============================================================================
// Getting Started Card
// ============================================================================

type GettingStartedStep = {
  readonly number: number;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly linkText: string;
};

const GETTING_STARTED_STEPS: GettingStartedStep[] = [
  {
    number: 1,
    title: 'Configure Your Vault',
    description:
      'Connect PaperSync to your Obsidian vault for seamless sync. Choose between local filesystem or GitHub.',
    href: '/settings',
    linkText: 'Open Settings',
  },
  {
    number: 2,
    title: 'Set Up Your Timetable',
    description:
      'Add your subjects and configure your weekly schedule. This will appear on your printed planner.',
    href: '/settings',
    linkText: 'Configure Timetable',
  },
  {
    number: 3,
    title: 'Generate a Planner',
    description:
      'Create a printable weekly planner with QR codes. Write your tasks and notes by hand.',
    href: '/planner',
    linkText: 'Create Planner',
  },
  {
    number: 4,
    title: 'Scan & Sync',
    description:
      'Scan your completed planner to extract handwritten entries and sync them to your vault.',
    href: '/scan',
    linkText: 'Start Scanning',
  },
];

const GettingStartedCard = (): React.ReactElement => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Getting Started</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold font-display">
            Getting Started
          </h2>
          <p className="text-sm text-muted">
            Follow these steps to set up PaperSync
          </p>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {GETTING_STARTED_STEPS.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex gap-4 p-4 bg-background rounded-lg border border-border hover:border-accent/30 transition-colors group"
          >
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm group-hover:bg-accent group-hover:text-white transition-colors">
                {step.number}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">{step.title}</h3>
              <p className="text-sm text-muted mt-1">{step.description}</p>
              <Link
                href={step.href}
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline mt-2"
              >
                {step.linkText}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <title>Arrow</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// ============================================================================
// Workflow Overview Card
// ============================================================================

const WorkflowOverviewCard = (): React.ReactElement => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Workflow</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold font-display">How It Works</h2>
          <p className="text-sm text-muted">
            The PaperSync workflow in 3 simple steps
          </p>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Print */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Print</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground mb-1">1. Print</h3>
          <p className="text-sm text-muted">
            Generate and print your weekly planner with embedded QR codes
          </p>
        </motion.div>

        {/* Step 2: Write */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Write</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground mb-1">2. Write</h3>
          <p className="text-sm text-muted">
            Fill in your tasks and notes by hand throughout the week
          </p>
        </motion.div>

        {/* Step 3: Scan */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Scan</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground mb-1">3. Scan & Sync</h3>
          <p className="text-sm text-muted">
            Scan your planner and watch AI extract your notes to Obsidian
          </p>
        </motion.div>
      </div>

      {/* Features list */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            'AI-Powered OCR',
            'Obsidian Sync',
            'QR Tracking',
            'Weekly Templates',
          ].map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-2"
            >
              <CheckIcon />
              <span className="text-sm text-foreground">{feature}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

// ============================================================================
// Dashboard Screen
// ============================================================================

export const DashboardScreen = (): React.ReactElement => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const weekNumber = Math.ceil(
    ((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) /
      86400000 +
      1) /
      7,
  );

  return (
    <PageTransition>
      <div className="page-container">
        {/* Header */}
        <header className="page-header">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-foreground">PaperSync</h1>
              <p className="text-muted mt-1">{formattedDate}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Button size="sm" variant="secondary">
                Week {weekNumber}
              </Button>
            </motion.div>
          </div>
        </header>

        {/* Quick Actions */}
        <section className="mb-10">
          <h2 className="sr-only">Quick Actions</h2>
          <QuickActions />
        </section>

        {/* Main Content */}
        <StaggerContainer className="space-y-6" staggerDelay={0.1}>
          <StaggerItem>
            <WorkflowOverviewCard />
          </StaggerItem>

          <StaggerItem>
            <GettingStartedCard />
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};
