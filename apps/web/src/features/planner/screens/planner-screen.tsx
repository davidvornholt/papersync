'use client';

import { EditorialHeader } from '@papersync/ui/editorial-header';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { PageTransition, Spinner } from '@/shared/components/motion';
import { useToast } from '@/shared/components/toast';
import { useSettings } from '@/shared/hooks/use-settings';
import type { DayOfWeek, ISODate, WeekId } from '@/shared/types/schemas';
import { usePlanner } from '../hooks/use-planner';
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

const easeOut = [0.2, 0.6, 0.2, 1] as const;

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
        <div className="shell page-shell flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="shell page-shell">
        <EditorialHeader
          index="Section iii"
          section="Generate planner"
          title="A week,"
          italicSuffix="set in ink."
          description="PaperSync composes a printable PDF for the week ahead — your subjects, your slots, the exceptions you bend in for assemblies and holidays. A small QR code in the corner remembers which week each page belongs to."
          aside={
            <dl className="space-y-5">
              <div>
                <dt className="mono-tag">This week</dt>
                <dd className="mt-1 serif text-[20px] text-ink">
                  {currentWeekId}
                </dd>
                <dd className="mt-1 mono text-[12px] text-graphite">
                  {dateRangeStr}
                </dd>
              </div>
              <div>
                <dt className="mono-tag">Output</dt>
                <dd className="mt-1 serif-italic text-[16px] text-ink-soft">
                  A4 PDF, anchored.
                </dd>
              </div>
            </dl>
          }
        />

        <div className="mt-8 sm:mt-10 md:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-y-10 sm:gap-y-12 lg:gap-x-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: easeOut }}
            className="lg:col-span-5"
          >
            <p className="section-number">01 — Compose</p>
            <h2 className="mt-3 text-[24px] sm:text-[28px]">
              Set the week, <span className="serif-italic">bend the rules</span>
              .
            </h2>
            <div className="mt-5 sm:mt-6">
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
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: easeOut }}
            className="lg:col-span-7 lg:border-l lg:border-hairline lg:pl-12"
          >
            <p className="section-number">02 — Proof</p>
            <h2 className="mt-3 text-[24px] sm:text-[28px]">
              The page,{' '}
              <span className="serif-italic ink">before printing</span>.
            </h2>
            <div className="mt-5 sm:mt-6">
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
            </div>
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
