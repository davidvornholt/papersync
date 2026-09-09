'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/shared/components/use-toast';
import { useSettings } from '@/shared/hooks/use-settings';
import { getWeekId, getWeekStartDate } from '@/shared/planner/week';
import type { DayOfWeek, ISODate, WeekId } from '@/shared/types/schemas';
import { usePlanner } from '../hooks/use-planner';
import {
  applyExceptionsToTimetable,
  formatDateRange,
  getSubjectsForWeek,
  upsertException,
} from './planner-screen-helpers';
import type { ScheduleException } from './planner-screen-types';

export const usePlannerScreen = () => {
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const [selectedWeekId, setSelectedWeekId] = useState<WeekId | null>(null);
  const [exceptions, setExceptions] = useState<Array<ScheduleException>>([]);
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

  const handleGenerate = () => {
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

    return planner.generate(
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

  return {
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
  };
};
