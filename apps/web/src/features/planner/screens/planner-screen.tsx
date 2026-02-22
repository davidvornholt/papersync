'use client';

import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { PageTransition, Spinner, useToast } from '@/shared/components';
import { useSettings } from '@/shared/hooks/use-settings';
import type { DayOfWeek, ISODate, WeekId } from '@/shared/types';
import { usePlanner } from '../hooks';
import { getWeekId, getWeekStartDate } from '../services/generator';
import { ExceptionEditorModal } from './components/exception-editor-modal';
import { PlannerConfigColumn } from './components/planner-config-column';
import { PreviewPanel } from './components/preview-panel';
import { WeekSelectionModal } from './components/week-selection-modal';
import {
  applyExceptionsToTimetable,
  formatDateRange,
  getDefaultSlotsForDay,
  getExceptionForDate,
  getPreviewState,
  getSubjectsForWeek,
  upsertException,
} from './planner-screen-helpers';
import type { ScheduleException } from './planner-screen-types';

export const PlannerScreen = (): React.ReactElement => {
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const [selectedWeekId, setSelectedWeekId] = useState<WeekId | null>(null);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [exceptionEditingDate, setExceptionEditingDate] = useState<{
    date: Date;
    dayOfWeek: DayOfWeek;
  } | null>(null);

  const currentWeekId = selectedWeekId ?? getWeekId();
  const planner = usePlanner(currentWeekId);
  const { addToast } = useToast();

  const weekStartDate = useMemo(
    () => getWeekStartDate(currentWeekId),
    [currentWeekId],
  );
  const dateRangeStr = formatDateRange(
    planner.dateRange.start,
    planner.dateRange.end,
  );

  const hasTimetableConfigured = settings.timetable.some(
    (day) => day.slots.length > 0,
  );

  const handleGenerate = (): void => {
    const subjectsToUse = getSubjectsForWeek(
      settings.timetable,
      settings.subjects,
      exceptions,
    );

    const timetableWithExceptions = applyExceptionsToTimetable(
      settings.timetable,
      weekStartDate,
      exceptions,
    );

    void planner.generate(
      subjectsToUse,
      timetableWithExceptions as Parameters<typeof planner.generate>[1],
    );
  };

  const handleWeekSelect = (weekId: WeekId): void => {
    setSelectedWeekId(weekId);
    setExceptions([]);
    planner.reset();
    addToast(`Selected ${weekId}`, 'info');
  };

  const handleSaveException = (
    exceptionData: Omit<ScheduleException, 'id'>,
  ): void => {
    setExceptions((prev) => upsertException(prev, exceptionData));
    addToast('Schedule exception saved', 'success');
  };

  const handleRemoveException = (): void => {
    if (!exceptionEditingDate) {
      return;
    }

    const isoDate = exceptionEditingDate.date
      .toISOString()
      .split('T')[0] as ISODate;
    setExceptions((prev) => prev.filter((entry) => entry.date !== isoDate));
    addToast('Exception removed', 'info');
  };

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
        <header className="page-header">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
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
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PlannerConfigColumn
            currentWeekId={currentWeekId}
            dateRangeStr={dateRangeStr}
            onOpenWeekModal={() => setIsWeekModalOpen(true)}
            weekStartDate={weekStartDate}
            timetable={settings.timetable}
            exceptions={exceptions}
            subjects={settings.subjects}
            hasTimetableConfigured={hasTimetableConfigured}
            onEditException={(date, dayOfWeek) =>
              setExceptionEditingDate({ date, dayOfWeek })
            }
            onGenerate={handleGenerate}
            isGenerating={planner.state.status === 'generating'}
            isGenerateDisabled={
              planner.state.status === 'generating' ||
              settings.subjects.length === 0 ||
              !hasTimetableConfigured
            }
          />

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <PreviewPanel
              state={getPreviewState(planner.state)}
              onDownload={() => {
                planner.download();
                addToast('Download started', 'info');
              }}
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
          defaultSlots={getDefaultSlotsForDay(
            settings.timetable,
            exceptionEditingDate.dayOfWeek,
          )}
          exception={getExceptionForDate(exceptions, exceptionEditingDate.date)}
          onSave={handleSaveException}
          onRemove={handleRemoveException}
        />
      )}
    </PageTransition>
  );
};
