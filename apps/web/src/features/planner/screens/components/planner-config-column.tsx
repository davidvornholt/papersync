import { StaggerContainer, StaggerItem } from '@/shared/components';
import type { TimetableDay } from '@/shared/hooks/use-settings';
import type { DayOfWeek, Subject } from '@/shared/types';
import type { ScheduleException } from '../planner-screen-types';
import { GeneratePlannerButton } from './generate-planner-button';
import { ScheduleOverviewCard } from './schedule-overview-card';
import { WeekSelectionCard } from './week-selection-card';

type PlannerConfigColumnProps = {
  readonly currentWeekId: string;
  readonly dateRangeStr: string;
  readonly onOpenWeekModal: () => void;
  readonly weekStartDate: Date;
  readonly timetable: readonly TimetableDay[];
  readonly exceptions: readonly ScheduleException[];
  readonly subjects: readonly Subject[];
  readonly hasTimetableConfigured: boolean;
  readonly onEditException: (date: Date, dayOfWeek: DayOfWeek) => void;
  readonly onGenerate: () => void;
  readonly isGenerating: boolean;
  readonly isGenerateDisabled: boolean;
};

export const PlannerConfigColumn = ({
  currentWeekId,
  dateRangeStr,
  onOpenWeekModal,
  weekStartDate,
  timetable,
  exceptions,
  subjects,
  hasTimetableConfigured,
  onEditException,
  onGenerate,
  isGenerating,
  isGenerateDisabled,
}: PlannerConfigColumnProps): React.ReactElement => (
  <StaggerContainer className="space-y-6">
    <StaggerItem>
      <WeekSelectionCard
        currentWeekId={currentWeekId}
        dateRangeStr={dateRangeStr}
        onOpenWeekModal={onOpenWeekModal}
      />
    </StaggerItem>

    <StaggerItem>
      <ScheduleOverviewCard
        weekStartDate={weekStartDate}
        timetable={timetable}
        exceptions={exceptions}
        subjects={subjects}
        hasTimetableConfigured={hasTimetableConfigured}
        onEditException={onEditException}
      />
    </StaggerItem>

    <StaggerItem>
      <GeneratePlannerButton
        isGenerating={isGenerating}
        isDisabled={isGenerateDisabled}
        onGenerate={onGenerate}
      />
    </StaggerItem>
  </StaggerContainer>
);
