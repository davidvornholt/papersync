'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Modal,
  PageTransition,
  Spinner,
  StaggerContainer,
  StaggerItem,
  useToast,
} from '@/app/shared/components';
import {
  type TimetableDay,
  useSettings,
} from '@/app/shared/hooks/use-settings';
import type { DayOfWeek, ISODate, Subject, WeekId } from '@/app/shared/types';
import { usePlanner } from '../hooks';
import { getWeekId, getWeekStartDate } from '../services/generator';

// ============================================================================
// Types
// ============================================================================

type ScheduleException = {
  id: string;
  date: ISODate;
  dayOfWeek: DayOfWeek;
  reason?: string;
  slots: Array<{ id: string; subjectId: string }>;
};

// ============================================================================
// Constants
// ============================================================================

// Only weekdays (Mon-Fri) - no weekend support
const WEEKDAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

// ============================================================================
// Week Selection Modal
// ============================================================================

type WeekSelectionModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentWeekId: WeekId;
  readonly onSelect: (weekId: WeekId) => void;
};

const WeekSelectionModal = ({
  isOpen,
  onClose,
  currentWeekId,
  onSelect,
}: WeekSelectionModalProps): React.ReactElement => {
  const [selectedWeekId, setSelectedWeekId] = useState<WeekId>(currentWeekId);

  // Generate available weeks (current week ± 4 weeks)
  const availableWeeks = useMemo(() => {
    const weeks: { weekId: WeekId; label: string; dateRange: string }[] = [];
    const today = new Date();

    for (let offset = -4; offset <= 8; offset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset * 7);
      const weekId = getWeekId(date);
      const startDate = getWeekStartDate(weekId);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const dateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
      };

      weeks.push({
        weekId,
        label:
          offset === 0
            ? 'This Week'
            : offset === 1
              ? 'Next Week'
              : offset === -1
                ? 'Last Week'
                : weekId,
        dateRange: `${startDate.toLocaleDateString('en-US', dateOptions)} – ${endDate.toLocaleDateString('en-US', { ...dateOptions, year: 'numeric' })}`,
      });
    }

    return weeks;
  }, []);

  const handleSelect = (): void => {
    onSelect(selectedWeekId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Week"
      description="Choose a week for your planner"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSelect}>Select Week</Button>
        </>
      }
    >
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {availableWeeks.map((week) => (
          <button
            key={week.weekId}
            type="button"
            onClick={() => setSelectedWeekId(week.weekId)}
            className={`w-full p-4 rounded-lg border text-left transition-all ${
              selectedWeekId === week.weekId
                ? 'border-accent bg-accent/10 ring-2 ring-accent/20'
                : 'border-border hover:border-accent/50 hover:bg-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{week.label}</p>
                <p className="text-sm text-muted">{week.dateRange}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-surface text-muted font-mono">
                {week.weekId}
              </span>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
};

// ============================================================================
// Exception Editor Modal
// ============================================================================

type ExceptionEditorModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly date: Date;
  readonly dayOfWeek: DayOfWeek;
  readonly subjects: readonly Subject[];
  readonly defaultSlots: Array<{ id: string; subjectId: string }>;
  readonly exception: ScheduleException | null;
  readonly onSave: (exception: Omit<ScheduleException, 'id'>) => void;
  readonly onRemove: () => void;
};

const ExceptionEditorModal = ({
  isOpen,
  onClose,
  date,
  dayOfWeek,
  subjects,
  defaultSlots,
  exception,
  onSave,
  onRemove,
}: ExceptionEditorModalProps): React.ReactElement => {
  const [slots, setSlots] = useState(exception?.slots ?? defaultSlots);
  const [reason, setReason] = useState(exception?.reason ?? '');

  const isEditing = exception !== null;

  // Reset when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setSlots(exception?.slots ?? defaultSlots);
      setReason(exception?.reason ?? '');
    }
  }, [isOpen, exception, defaultSlots]);

  const handleAddSlot = (): void => {
    if (subjects.length > 0) {
      setSlots((prev) => [
        ...prev,
        { id: `slot-${Date.now()}`, subjectId: subjects[0].id },
      ]);
    }
  };

  const handleRemoveSlot = (slotId: string): void => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const handleChangeSlot = (slotId: string, subjectId: string): void => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, subjectId } : s)),
    );
  };

  const handleSave = (): void => {
    const isoDate = date.toISOString().split('T')[0] as ISODate;
    onSave({
      date: isoDate,
      dayOfWeek,
      reason: reason.trim() || undefined,
      slots,
    });
    onClose();
  };

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Exception' : 'Add Exception'}
      description={`Modify the schedule for ${dateStr}`}
      size="md"
      footer={
        <>
          {isEditing && (
            <Button
              variant="ghost"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="mr-auto text-red-500 hover:text-red-600"
            >
              Remove Exception
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Add Exception'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Reason */}
        <div>
          <label
            htmlFor="exception-reason"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Reason (optional)
          </label>
          <input
            id="exception-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Field trip, Guest speaker, Exam"
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
          />
        </div>

        {/* Slots */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-sm font-medium text-foreground">
              Classes for this day
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddSlot}
              disabled={subjects.length === 0}
            >
              <svg
                className="w-4 h-4 mr-1"
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
              Add
            </Button>
          </div>

          {slots.length === 0 ? (
            <div className="text-center py-6 text-muted border-2 border-dashed border-border rounded-lg">
              <p className="text-sm">No classes (day off)</p>
            </div>
          ) : (
            <div className="space-y-2">
              {slots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border"
                >
                  <span className="text-xs text-muted bg-surface w-6 h-6 rounded flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <select
                    value={slot.subjectId}
                    onChange={(e) => handleChangeSlot(slot.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(slot.id)}
                    className="p-2 text-muted hover:text-red-500 transition-colors"
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
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// Week Schedule Overview
// ============================================================================

type WeekScheduleOverviewProps = {
  readonly weekStartDate: Date;
  readonly timetable: readonly TimetableDay[];
  readonly exceptions: ScheduleException[];
  readonly subjects: readonly Subject[];
  readonly onEditException: (date: Date, dayOfWeek: DayOfWeek) => void;
};

const WeekScheduleOverview = ({
  weekStartDate,
  timetable,
  exceptions,
  subjects,
  onEditException,
}: WeekScheduleOverviewProps): React.ReactElement => {
  const getSubjectName = (subjectId: string): string => {
    return subjects.find((s) => s.id === subjectId)?.name ?? 'Unknown';
  };

  const getDayDate = (dayIndex: number): Date => {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + dayIndex);
    return date;
  };

  const getExceptionForDate = (date: Date): ScheduleException | undefined => {
    const isoDate = date.toISOString().split('T')[0] as ISODate;
    return exceptions.find((e) => e.date === isoDate);
  };

  return (
    <div className="space-y-2">
      {WEEKDAYS.map((day, index) => {
        const daySchedule = timetable.find((d) => d.day === day);
        const dayDate = getDayDate(index);
        const exception = getExceptionForDate(dayDate);
        const hasException = exception !== undefined;
        const slots = hasException
          ? exception.slots
          : (daySchedule?.slots ?? []);
        const dateStr = dayDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        return (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-3 rounded-lg border transition-all ${
              hasException
                ? 'border-amber-500/50 bg-amber-500/5'
                : 'border-border bg-background'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-center min-w-[48px]">
                  <p className="text-xs text-muted uppercase">
                    {DAY_SHORT_LABELS[day]}
                  </p>
                  <p className="font-semibold text-foreground">{dateStr}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex-1">
                  {slots.length === 0 ? (
                    <span className="text-sm text-muted italic">
                      No classes
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {slots.map((slot, idx) => (
                        <span
                          key={slot.id}
                          className="text-xs px-2 py-1 rounded bg-surface text-foreground"
                        >
                          {idx + 1}. {getSubjectName(slot.subjectId)}
                        </span>
                      ))}
                    </div>
                  )}
                  {hasException && exception.reason && (
                    <p className="text-xs text-amber-600 mt-1">
                      {exception.reason}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditException(dayDate, day)}
                className={hasException ? 'text-amber-600' : ''}
              >
                {hasException ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Exception</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Add exception</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Exception
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ============================================================================
// Preview Component
// ============================================================================

type PreviewPanelState = 'configure' | 'generating' | 'generated' | 'error';

type PreviewPanelProps = {
  readonly state: PreviewPanelState;
  readonly onDownload: () => void;
  readonly onOpen: () => void;
  readonly weekId: string;
  readonly errorMessage?: string;
};

const PreviewPanel = ({
  state,
  onDownload,
  onOpen,
  weekId,
  errorMessage,
}: PreviewPanelProps): React.ReactElement => (
  <Card elevated className="h-full">
    <CardHeader>
      <h2 className="text-lg font-semibold font-display">Preview</h2>
    </CardHeader>
    <CardContent className="flex items-center justify-center min-h-[400px]">
      <AnimatePresence mode="wait">
        {state === 'generating' && (
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

        {state === 'generated' && (
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
              transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
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
            <div className="flex gap-3">
              <Button onClick={onOpen} variant="secondary" size="lg">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <title>Open</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Open
              </Button>
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
                Download
              </Button>
            </div>
          </motion.div>
        )}

        {state === 'configure' && (
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
            <p className="text-muted">Review schedule and generate your PDF</p>
          </motion.div>
        )}

        {state === 'error' && (
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
                {errorMessage ?? 'An unexpected error occurred'}
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

export const PlannerScreen = (): React.ReactElement => {
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const [selectedWeekId, setSelectedWeekId] = useState<WeekId | null>(null);
  const currentWeekId = selectedWeekId ?? getWeekId();
  const planner = usePlanner(currentWeekId);

  // Local exceptions state (per-week, not persisted in settings)
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);

  // Modal states
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [exceptionEditingDate, setExceptionEditingDate] = useState<{
    date: Date;
    dayOfWeek: DayOfWeek;
  } | null>(null);

  const { addToast } = useToast();

  // Get week start date
  const weekStartDate = useMemo(() => {
    return getWeekStartDate(currentWeekId);
  }, [currentWeekId]);

  // Format date range for display
  const formatDateRange = (start: Date, end: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
    };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', {
      ...options,
      year: 'numeric',
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
      case 'generating':
        return 'generating';
      case 'generated':
        return 'generated';
      case 'error':
        return 'error';
      default:
        return 'configure';
    }
  };

  // Get subjects for the week (combine timetable + exceptions)
  const getSubjectsForWeek = useCallback((): readonly Subject[] => {
    const subjectIds = new Set<string>();

    // Add subjects from timetable
    for (const day of settings.timetable) {
      for (const slot of day.slots) {
        subjectIds.add(slot.subjectId);
      }
    }

    // Add subjects from exceptions
    for (const exception of exceptions) {
      for (const slot of exception.slots) {
        subjectIds.add(slot.subjectId);
      }
    }

    // If nothing configured, use all subjects
    if (subjectIds.size === 0) {
      return settings.subjects;
    }

    return settings.subjects.filter((s) => subjectIds.has(s.id));
  }, [settings.timetable, settings.subjects, exceptions]);

  const handleGenerate = async (): Promise<void> => {
    const subjectsToUse = getSubjectsForWeek();

    // Filter timetable to only include weekdays (Mon-Fri)
    const weekdayTimetable = settings.timetable.filter(
      (day) =>
        day.day === 'monday' ||
        day.day === 'tuesday' ||
        day.day === 'wednesday' ||
        day.day === 'thursday' ||
        day.day === 'friday',
    );

    // Apply exceptions to the timetable
    // Each exception replaces the slots for its corresponding day
    const timetableWithExceptions = weekdayTimetable.map((daySchedule) => {
      // Find the date for this day in the current week
      const dayIndex = WEEKDAYS.indexOf(daySchedule.day);
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + dayIndex);
      const isoDate = dayDate.toISOString().split('T')[0] as ISODate;

      // Check if there's an exception for this date
      const exception = exceptions.find((e) => e.date === isoDate);
      if (exception) {
        // Replace slots with exception's slots
        return {
          ...daySchedule,
          slots: exception.slots,
        };
      }

      return daySchedule;
    });

    await planner.generate(
      subjectsToUse,
      timetableWithExceptions as Parameters<typeof planner.generate>[1],
    );
  };

  const handleDownload = (): void => {
    planner.download();
    addToast('Download started', 'info');
  };

  const handleWeekSelect = (weekId: WeekId): void => {
    setSelectedWeekId(weekId);
    setExceptions([]); // Clear exceptions when changing week
    planner.reset();
    addToast(`Selected ${weekId}`, 'info');
  };

  const handleEditException = (date: Date, dayOfWeek: DayOfWeek): void => {
    setExceptionEditingDate({ date, dayOfWeek });
  };

  const handleSaveException = (
    exceptionData: Omit<ScheduleException, 'id'>,
  ): void => {
    setExceptions((prev) => {
      const existing = prev.find((e) => e.date === exceptionData.date);
      if (existing) {
        return prev.map((e) =>
          e.date === exceptionData.date ? { ...exceptionData, id: e.id } : e,
        );
      }
      return [...prev, { ...exceptionData, id: `exc-${Date.now()}` }];
    });
    addToast('Schedule exception saved', 'success');
  };

  const handleRemoveException = (): void => {
    if (exceptionEditingDate) {
      const isoDate = exceptionEditingDate.date
        .toISOString()
        .split('T')[0] as ISODate;
      setExceptions((prev) => prev.filter((e) => e.date !== isoDate));
      addToast('Exception removed', 'info');
    }
  };

  // Get default slots for the exception editor
  const getDefaultSlotsForDay = (
    dayOfWeek: DayOfWeek,
  ): Array<{ id: string; subjectId: string }> => {
    const daySchedule = settings.timetable.find((d) => d.day === dayOfWeek);
    return daySchedule?.slots.map((s) => ({ ...s })) ?? [];
  };

  // Get existing exception for the editing date
  const getExceptionForEditingDate = (): ScheduleException | null => {
    if (!exceptionEditingDate) return null;
    const isoDate = exceptionEditingDate.date
      .toISOString()
      .split('T')[0] as ISODate;
    return exceptions.find((e) => e.date === isoDate) ?? null;
  };

  // Count exceptions
  const exceptionsCount = exceptions.length;

  // Check if timetable is configured
  const hasTimetableConfigured = settings.timetable.some(
    (d) => d.slots.length > 0,
  );

  if (isSettingsLoading) {
    return (
      <PageTransition>
        <div className="page-container flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="page-container">
        {/* Header */}
        <header className="page-header">
          <div className="flex items-center justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-foreground"
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
            {/* Week Selection */}
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
                        {currentWeekId}
                      </p>
                      <p className="text-sm text-muted">{dateRangeStr}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsWeekModalOpen(true)}
                    >
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Week Schedule with Exceptions */}
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
                          <title>Schedule</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold font-display">
                          Week Schedule
                        </h2>
                        <p className="text-sm text-muted">
                          {exceptionsCount > 0
                            ? `${exceptionsCount} exception${exceptionsCount !== 1 ? 's' : ''} for this week`
                            : 'Review and add exceptions if needed'}
                        </p>
                      </div>
                    </div>
                    <Link href="/settings">
                      <Button variant="ghost" size="sm">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <title>Settings</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Edit Timetable
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {!hasTimetableConfigured ? (
                    <div className="text-center py-8 text-muted border-2 border-dashed border-border rounded-lg">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 text-muted-light"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <title>No timetable</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      <p className="font-medium">No timetable configured</p>
                      <p className="text-sm mt-1">
                        Configure your weekly schedule in Settings first
                      </p>
                      <Link href="/settings">
                        <Button variant="ghost" size="sm" className="mt-3">
                          Go to Settings
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <WeekScheduleOverview
                      weekStartDate={weekStartDate}
                      timetable={settings.timetable}
                      exceptions={exceptions}
                      subjects={settings.subjects}
                      onEditException={handleEditException}
                    />
                  )}
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Generate Button */}
            <StaggerItem>
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  onClick={handleGenerate}
                  disabled={
                    planner.state.status === 'generating' ||
                    settings.subjects.length === 0 ||
                    !hasTimetableConfigured
                  }
                  className="w-full"
                  size="lg"
                >
                  {planner.state.status === 'generating' ? (
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
              onOpen={planner.openInNewTab}
              weekId={currentWeekId}
              errorMessage={
                planner.state.status === 'error'
                  ? planner.state.error
                  : undefined
              }
            />
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <WeekSelectionModal
        isOpen={isWeekModalOpen}
        onClose={() => setIsWeekModalOpen(false)}
        currentWeekId={currentWeekId}
        onSelect={handleWeekSelect}
      />

      {exceptionEditingDate && (
        <ExceptionEditorModal
          isOpen={true}
          onClose={() => setExceptionEditingDate(null)}
          date={exceptionEditingDate.date}
          dayOfWeek={exceptionEditingDate.dayOfWeek}
          subjects={settings.subjects}
          defaultSlots={getDefaultSlotsForDay(exceptionEditingDate.dayOfWeek)}
          exception={getExceptionForEditingDate()}
          onSave={handleSaveException}
          onRemove={handleRemoveException}
        />
      )}
    </PageTransition>
  );
};
