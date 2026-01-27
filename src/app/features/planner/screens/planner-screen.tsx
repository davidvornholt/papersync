"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  PageTransition,
  Spinner,
  StaggerContainer,
  StaggerItem,
  useToast,
} from "@/app/shared/components";
import type { Subject } from "@/app/shared/types";
import { usePlanner } from "../hooks";

// ============================================================================
// Subject Item Component
// ============================================================================

type SubjectItemProps = {
  readonly subject: Subject;
  readonly index: number;
  readonly onRemove: (id: string) => void;
  readonly onMove: (id: string, direction: "up" | "down") => void;
  readonly isFirst: boolean;
  readonly isLast: boolean;
};

const SubjectItem = ({
  subject,
  index,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: SubjectItemProps): React.ReactElement => (
  <motion.li
    layout
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 10, height: 0 }}
    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border group"
  >
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onMove(subject.id, "up")}
          disabled={isFirst}
          className="p-0.5 text-muted hover:text-accent disabled:opacity-30 transition-colors"
          title="Move up"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Move up</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onMove(subject.id, "down")}
          disabled={isLast}
          className="p-0.5 text-muted hover:text-accent disabled:opacity-30 transition-colors"
          title="Move down"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Move down</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
      <span className="text-foreground font-medium">{subject.name}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded">
        Slot {index + 1}
      </span>
      <button
        type="button"
        onClick={() => onRemove(subject.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-500 transition-all"
        title="Remove subject"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <title>Remove</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </motion.li>
);

// ============================================================================
// Add Subject Modal
// ============================================================================

type AddSubjectModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onAdd: (name: string) => void;
};

const AddSubjectModal = ({
  isOpen,
  onClose,
  onAdd,
}: AddSubjectModalProps): React.ReactElement => {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim());
      setName("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <Card elevated className="p-6">
              <h3 className="text-lg font-semibold font-display mb-4">
                Add Subject
              </h3>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Subject name"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent mb-4"
                  autoFocus
                />
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!name.trim()}>
                    Add Subject
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// Preview Component
// ============================================================================

type PreviewPanelState = "configure" | "generating" | "generated" | "error";

type PreviewPanelProps = {
  readonly state: PreviewPanelState;
  readonly onDownload: () => void;
  readonly weekId: string;
  readonly errorMessage?: string;
};

const PreviewPanel = ({
  state,
  onDownload,
  weekId,
  errorMessage,
}: PreviewPanelProps): React.ReactElement => (
  <Card elevated className="h-full">
    <CardHeader>
      <h2 className="text-lg font-semibold font-display">Preview</h2>
    </CardHeader>
    <CardContent className="flex items-center justify-center min-h-[500px]">
      <AnimatePresence mode="wait">
        {state === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-16 h-16 mx-auto flex items-center justify-center">
              <Spinner size="lg" />
            </div>
            <div>
              <p className="font-medium text-foreground">Generating PDF...</p>
              <p className="text-sm text-muted mt-1">
                Creating your weekly planner
              </p>
            </div>
          </motion.div>
        )}

        {state === "generated" && (
          <motion.div
            key="generated"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
              className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center"
            >
              <motion.svg
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="w-10 h-10 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <title>Success</title>
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </motion.svg>
            </motion.div>
            <div>
              <p className="font-semibold text-lg text-foreground">
                PDF Generated!
              </p>
              <p className="text-sm text-muted mt-1">
                Your planner for {weekId} is ready
              </p>
            </div>
            <Button onClick={onDownload} size="lg">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Download</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download PDF
            </Button>
          </motion.div>
        )}

        {state === "configure" && (
          <motion.div
            key="configure"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="w-48 h-64 mx-auto border-2 border-dashed border-border rounded-lg flex items-center justify-center mb-4 hover:border-accent/50 transition-colors">
              <svg
                className="w-12 h-12 text-muted-light"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <title>Document Preview</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-muted">
              Configure settings and generate your PDF
            </p>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <title>Error</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Generation Failed</p>
              <p className="text-sm text-muted mt-1">
                {errorMessage ?? "An unexpected error occurred"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CardContent>
  </Card>
);

// ============================================================================
// Planner Screen
// ============================================================================

const defaultSubjects: Subject[] = [
  { id: "1", name: "Mathematics", order: 1 },
  { id: "2", name: "Physics", order: 2 },
  { id: "3", name: "Chemistry", order: 3 },
  { id: "4", name: "Literature", order: 4 },
];

export const PlannerScreen = (): React.ReactElement => {
  const planner = usePlanner();
  const [subjects, setSubjects] = useState<Subject[]>(defaultSubjects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  // Format date range for display
  const formatDateRange = (start: Date, end: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
    };
    const startStr = start.toLocaleDateString("en-US", options);
    const endStr = end.toLocaleDateString("en-US", {
      ...options,
      year: "numeric",
    });
    return `${startStr} – ${endStr}`;
  };

  const dateRangeStr = formatDateRange(
    planner.dateRange.start,
    planner.dateRange.end,
  );

  // Map planner state to preview state
  const getPreviewState = (): PreviewPanelState => {
    switch (planner.state.status) {
      case "generating":
        return "generating";
      case "generated":
        return "generated";
      case "error":
        return "error";
      default:
        return "configure";
    }
  };

  const handleGenerate = async (): Promise<void> => {
    // Use a default vault path for now (would come from settings in real app)
    const vaultPath = "/home/user/Obsidian/Vault";
    await planner.generate(subjects, vaultPath);

    if (planner.state.status === "error") {
      addToast("Failed to generate PDF", "error");
    } else {
      addToast("PDF generated successfully!", "success");
    }
  };

  const handleDownload = (): void => {
    planner.download();
    addToast("Download started", "info");
  };

  const handleAddSubject = (name: string): void => {
    const newSubject: Subject = {
      id: `subj-${Date.now()}`,
      name,
      order: subjects.length + 1,
    };
    setSubjects((prev) => [...prev, newSubject]);
    addToast(`Added "${name}"`, "success");
  };

  const handleRemoveSubject = (id: string): void => {
    const subject = subjects.find((s) => s.id === id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    if (subject) {
      addToast(`Removed "${subject.name}"`, "info");
    }
  };

  const handleMoveSubject = (id: string, direction: "up" | "down"): void => {
    const index = subjects.findIndex((s) => s.id === id);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subjects.length) return;

    const newSubjects = [...subjects];
    [newSubjects[index], newSubjects[newIndex]] = [
      newSubjects[newIndex],
      newSubjects[index],
    ];
    setSubjects(newSubjects);
  };

  return (
    <PageTransition>
      <div className="page-container">
        {/* Header */}
        <header className="page-header">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors group"
              >
                <svg
                  className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <title>Back</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Dashboard
              </Link>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-foreground mt-2"
              >
                Generate Planner
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-muted mt-1"
              >
                Create a printable weekly planner with QR sync
              </motion.p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <StaggerContainer className="space-y-6">
            <StaggerItem>
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
                        <title>Calendar</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold font-display">
                        Week Selection
                      </h2>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:border-accent/50 transition-colors">
                    <div>
                      <p className="font-semibold text-foreground">
                        {planner.weekId}
                      </p>
                      <p className="text-sm text-muted">{dateRangeStr}</p>
                    </div>
                    <Button variant="secondary" size="sm">
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <title>Subjects</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold font-display">
                          Subjects
                        </h2>
                        <p className="text-sm text-muted">
                          {subjects.length} subject
                          {subjects.length !== 1 ? "s" : ""} configured
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <AnimatePresence>
                      {subjects.map((subject, index) => (
                        <SubjectItem
                          key={subject.id}
                          subject={subject}
                          index={index}
                          onRemove={handleRemoveSubject}
                          onMove={handleMoveSubject}
                          isFirst={index === 0}
                          isLast={index === subjects.length - 1}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Add</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Subject
                  </Button>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  onClick={handleGenerate}
                  disabled={
                    planner.state.status === "generating" ||
                    subjects.length === 0
                  }
                  className="w-full"
                  size="lg"
                >
                  {planner.state.status === "generating" ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <title>Generate</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Generate PDF
                    </>
                  )}
                </Button>
              </motion.div>
            </StaggerItem>
          </StaggerContainer>

          {/* Preview Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PreviewPanel
              state={getPreviewState()}
              onDownload={handleDownload}
              weekId={planner.weekId}
              errorMessage={
                planner.state.status === "error"
                  ? planner.state.error
                  : undefined
              }
            />
          </motion.div>
        </div>
      </div>

      <AddSubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddSubject}
      />
    </PageTransition>
  );
};
