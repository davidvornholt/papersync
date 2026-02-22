'use client';

import { motion } from 'motion/react';
import { Button } from '@/shared/components';
import type { TimetableDay } from '@/shared/hooks/use-settings';
import type { DayOfWeek, ISODate, Subject } from '@/shared/types';
import {
  DAY_SHORT_LABELS,
  type ScheduleException,
  WEEKDAYS,
} from '../planner-screen-types';

type WeekScheduleOverviewProps = {
  readonly weekStartDate: Date;
  readonly timetable: readonly TimetableDay[];
  readonly exceptions: readonly ScheduleException[];
  readonly subjects: readonly Subject[];
  readonly onEditException: (date: Date, dayOfWeek: DayOfWeek) => void;
};

export const WeekScheduleOverview = ({
  weekStartDate,
  timetable,
  exceptions,
  subjects,
  onEditException,
}: WeekScheduleOverviewProps): React.ReactElement => {
  const getSubjectName = (subjectId: string): string =>
    subjects.find((subject) => subject.id === subjectId)?.name ?? 'Unknown';

  return (
    <div className="space-y-2">
      {WEEKDAYS.map((day, index) => {
        const daySchedule = timetable.find((entry) => entry.day === day);
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(dayDate.getDate() + index);
        const isoDate = dayDate.toISOString().split('T')[0] as ISODate;

        const exception = exceptions.find((entry) => entry.date === isoDate);
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
                      {slots.map((slot, slotIndex) => (
                        <span
                          key={slot.id}
                          className="text-xs px-2 py-1 rounded bg-surface text-foreground"
                        >
                          {slotIndex + 1}. {getSubjectName(slot.subjectId)}
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
                {hasException ? 'Edit' : 'Exception'}
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
