'use client';

import { EditorialHeader } from '@papersync/ui/editorial-header';
import { motion } from 'motion/react';
import { PageTransition } from '@/shared/components/motion-layout';
import { Spinner } from '@/shared/components/motion-loading';
import { ExceptionEditorModal } from './components/exception-editor-modal';
import { PlannerConfigColumn } from './components/planner-config-column';
import { PreviewPanel } from './components/preview-panel';
import { WeekSelectionModal } from './components/week-selection-modal';
import {
  getDefaultSlotsForDay,
  getExceptionForDate,
  getPreviewState,
} from './planner-screen-helpers';
import { usePlannerScreen } from './use-planner-screen';

const easeOut = 'easeOut' as const;

export const PlannerScreen = (): React.ReactElement => {
  const {
    settings,
    isSettingsLoading,
    isWeekModalOpen,
    setIsWeekModalOpen,
    exceptionEditingDate,
    setExceptionEditingDate,
    currentWeekId,
    planner,
    addToast,
    weekStartDate,
    dateRangeStr,
    hasTimetableConfigured,
    handleGenerate,
    handleWeekSelect,
    handleSaveException,
    handleRemoveException,
    exceptions,
  } = usePlannerScreen();

  if (isSettingsLoading) {
    return (
      <PageTransition>
        <div className="shell page-shell flex min-h-[60vh] items-center justify-center">
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
                <dd className="serif mt-1 text-[20px] text-ink">
                  {currentWeekId}
                </dd>
                <dd className="mono mt-1 text-[12px] text-graphite">
                  {dateRangeStr}
                </dd>
              </div>
              <div>
                <dt className="mono-tag">Output</dt>
                <dd className="serif-italic mt-1 text-[16px] text-ink-soft">
                  A4 PDF, anchored.
                </dd>
              </div>
            </dl>
          }
        />

        <div className="mt-8 grid grid-cols-1 gap-y-10 sm:mt-10 sm:gap-y-12 md:mt-14 lg:grid-cols-12 lg:gap-x-12">
          <motion.div
            initial={false}
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
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: easeOut }}
            className="lg:col-span-7 lg:border-hairline lg:border-l lg:pl-12"
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

      {exceptionEditingDate ? (
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
      ) : null}
    </PageTransition>
  );
};
