'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/shared/components';

type GettingStartedStep = {
  readonly number: number;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly linkText: string;
};

const GETTING_STARTED_STEPS: readonly GettingStartedStep[] = [
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

export const GettingStartedCard = (): React.ReactElement => (
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
