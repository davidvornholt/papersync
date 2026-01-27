"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  HoverScale,
  PageTransition,
  StaggerContainer,
  StaggerItem,
  useToast,
} from "@/app/shared/components";

// ============================================================================
// Types
// ============================================================================

type TaskItem = {
  readonly id: string;
  readonly content: string;
  readonly subject: string;
  readonly day: string;
  readonly isCompleted: boolean;
  readonly priority?: "high" | "medium" | "low";
};

type TaskSectionProps = {
  readonly title: string;
  readonly description: string;
  readonly tasks: readonly TaskItem[];
  readonly emptyMessage: string;
  readonly icon: React.ReactNode;
};

// ============================================================================
// Icons
// ============================================================================

const CalendarIcon = (): React.ReactElement => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <title>Calendar</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ClockIcon = (): React.ReactElement => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <title>Clock</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ListIcon = (): React.ReactElement => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <title>List</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  </svg>
);

// ============================================================================
// Task Item Component
// ============================================================================

type TaskItemComponentProps = {
  readonly task: TaskItem;
  readonly onToggle: (id: string) => void;
};

const TaskItemComponent = ({
  task,
  onToggle,
}: TaskItemComponentProps): React.ReactElement => (
  <motion.li
    layout
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 10 }}
    className="flex items-start gap-3 group py-2"
  >
    <motion.button
      type="button"
      onClick={() => onToggle(task.id)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        task.isCompleted
          ? "bg-accent border-accent text-white"
          : "border-border hover:border-accent"
      }`}
      aria-label={`Mark "${task.content}" as ${task.isCompleted ? "incomplete" : "complete"}`}
    >
      {task.isCompleted && (
        <motion.svg
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <title>Completed check mark</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      )}
    </motion.button>
    <div className="flex-1 min-w-0">
      <p
        className={`text-sm transition-all ${
          task.isCompleted
            ? "line-through text-muted"
            : "text-foreground group-hover:text-accent"
        }`}
      >
        {task.content}
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            task.priority === "high"
              ? "bg-red-500"
              : task.priority === "medium"
                ? "bg-amber-500"
                : "bg-border"
          }`}
        />
        <span className="text-xs text-muted-light">
          {task.subject} · {task.day}
        </span>
      </div>
    </div>
  </motion.li>
);

// ============================================================================
// Task Section Component
// ============================================================================

const TaskSection = ({
  title,
  description,
  tasks,
  emptyMessage,
  icon,
}: TaskSectionProps): React.ReactElement => {
  const { addToast } = useToast();

  const handleToggle = (id: string): void => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      addToast(
        task.isCompleted
          ? `"${task.content}" marked incomplete`
          : `"${task.content}" completed! 🎉`,
        task.isCompleted ? "info" : "success",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold font-display">{title}</h2>
            <p className="text-sm text-muted">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-light"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <title>No tasks</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-muted text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((task) => (
              <TaskItemComponent
                key={task.id}
                task={task}
                onToggle={handleToggle}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

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
// Dashboard Screen
// ============================================================================

// Sample data for demonstration
const sampleTasks: TaskItem[] = [
  {
    id: "1",
    content: "Complete problem set 6 on differential equations",
    subject: "Mathematics",
    day: "Today",
    isCompleted: false,
    priority: "high",
  },
  {
    id: "2",
    content: "Review chapter 13 notes on wave mechanics",
    subject: "Physics",
    day: "Today",
    isCompleted: false,
    priority: "medium",
  },
  {
    id: "3",
    content: "Email professor about project extension",
    subject: "General",
    day: "Today",
    isCompleted: true,
    priority: "low",
  },
  {
    id: "4",
    content: "Prepare lab report introduction",
    subject: "Chemistry",
    day: "Tomorrow",
    isCompleted: false,
    priority: "medium",
  },
  {
    id: "5",
    content: "Read chapters 5-6 for literature review",
    subject: "Literature",
    day: "Wednesday",
    isCompleted: false,
    priority: "low",
  },
];

export const DashboardScreen = (): React.ReactElement => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const weekNumber = Math.ceil(
    ((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) /
      86400000 +
      1) /
      7,
  );

  const todayTasks = sampleTasks.filter(
    (t) => t.day === "Today" && !t.isCompleted,
  );
  const tomorrowTasks = sampleTasks.filter((t) => t.day === "Tomorrow");
  const upcomingTasks = sampleTasks.filter(
    (t) => !["Today", "Tomorrow"].includes(t.day),
  );
  const completedTasks = sampleTasks.filter((t) => t.isCompleted);

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

        {/* Task Sections */}
        <StaggerContainer className="space-y-6" staggerDelay={0.1}>
          <StaggerItem>
            <TaskSection
              title="Due Today"
              description={`${todayTasks.length} task${todayTasks.length !== 1 ? "s" : ""} remaining`}
              tasks={todayTasks}
              emptyMessage="All caught up! No tasks due today."
              icon={<CalendarIcon />}
            />
          </StaggerItem>

          <StaggerItem>
            <TaskSection
              title="Due Tomorrow"
              description="Plan ahead for tomorrow"
              tasks={tomorrowTasks}
              emptyMessage="Nothing scheduled for tomorrow yet."
              icon={<ClockIcon />}
            />
          </StaggerItem>

          <StaggerItem>
            <TaskSection
              title="Upcoming"
              description="Tasks due later this week"
              tasks={upcomingTasks}
              emptyMessage="No upcoming tasks. Time to plan ahead!"
              icon={<ListIcon />}
            />
          </StaggerItem>

          {completedTasks.length > 0 && (
            <StaggerItem>
              <TaskSection
                title="Completed"
                description="Great work!"
                tasks={completedTasks}
                emptyMessage=""
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Completed</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
            </StaggerItem>
          )}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};
