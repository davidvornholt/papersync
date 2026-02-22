'use client';

import { motion } from 'motion/react';
import {
  Button,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from '@/shared/components';
import { DashboardQuickActions } from '../components/dashboard-quick-actions';
import { GettingStartedCard } from '../components/getting-started-card';
import { WorkflowOverviewCard } from '../components/workflow-overview-card';

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

        <section className="mb-10">
          <h2 className="sr-only">Quick Actions</h2>
          <DashboardQuickActions />
        </section>

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
