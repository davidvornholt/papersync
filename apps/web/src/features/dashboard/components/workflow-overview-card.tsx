'use client';

import { motion } from 'motion/react';
import { Card, CardContent, CardHeader } from '@/shared/components';

type WorkflowStep = {
  readonly title: string;
  readonly description: string;
  readonly iconPath: string;
  readonly colorClass: string;
  readonly bgClass: string;
};

const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    title: '1. Print',
    description:
      'Generate and print your weekly planner with embedded QR codes',
    iconPath:
      'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
    colorClass: 'text-accent',
    bgClass: 'from-accent/20 to-accent/5',
  },
  {
    title: '2. Write',
    description: 'Fill in your tasks and notes by hand throughout the week',
    iconPath:
      'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
    colorClass: 'text-blue-500',
    bgClass: 'from-blue-500/20 to-blue-500/5',
  },
  {
    title: '3. Scan & Sync',
    description:
      'Scan your planner and watch AI extract your notes to Obsidian',
    iconPath:
      'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
    colorClass: 'text-purple-500',
    bgClass: 'from-purple-500/20 to-purple-500/5',
  },
];

const FEATURES = [
  'AI-Powered OCR',
  'Obsidian Sync',
  'QR Tracking',
  'Weekly Templates',
] as const;

export const WorkflowOverviewCard = (): React.ReactElement => (
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
        {WORKFLOW_STEPS.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.1 }}
            className="text-center"
          >
            <div
              className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${step.bgClass} flex items-center justify-center`}
            >
              <svg
                className={`w-8 h-8 ${step.colorClass}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>{step.title}</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={step.iconPath}
                />
                {step.title.includes('Scan') && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                )}
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
            <p className="text-sm text-muted">{step.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-2"
            >
              <svg
                className="w-5 h-5 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Check</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm text-foreground">{feature}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);
