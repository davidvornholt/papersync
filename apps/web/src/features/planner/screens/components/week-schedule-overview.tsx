'use client';

import { Button } from '@papersync/ui/button';
import { motion } from 'motion/react';
import type { TimetableDay } from '@/shared/hooks/use-settings';
import type { DayOfWeek, ISODate, Subject } from '@/shared/types/schemas';
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
    <ul className="-mx-1">
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
          <motion.li
            key={day}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`relative px-1 py-3 border-b border-hairline last:border-b-0 ${
              hasException ? 'bg-warning/5' : ''
            }`}
          >
            {hasException && (
              <span
                aria-hidden
                className="absolute inset-y-2 left-0 w-[2px] bg-warning"
              />
            )}
            <div className="grid grid-cols-[64px_1fr] gap-3 items-start sm:grid-cols-[72px_1fr_auto] sm:gap-4 sm:items-center">
              <div className="pt-0.5">
                <p className="mono text-[10px] uppercase tracking-[0.18em] text-graphite">
                  {DAY_SHORT_LABELS[day]}
                </p>
                <p className="serif text-[15px] text-ink leading-tight mt-0.5">
                  {dateStr}
                </p>
              </div>

              <div className="min-w-0">
                {slots.length === 0 ? (
                  <span className="serif-italic text-[13px] text-graphite">
                    No classes
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {slots.map((slot, slotIndex) => (
                      <span
                        key={slot.id}
                        className="text-[12px] px-2 py-0.5 bg-paper-deep text-ink border border-hairline"
                      >
                        {slotIndex + 1}. {getSubjectName(slot.subjectId)}
                      </span>
                    ))}
                  </div>
                )}
                {hasException && exception.reason && (
                  <p className="serif-italic text-[12px] text-warning mt-1">
                    {exception.reason}
                  </p>
                )}
              </div>

              <div className="col-span-2 -mx-1 mt-1 flex justify-end sm:col-span-1 sm:m-0 sm:justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditException(dayDate, day)}
                  className={hasException ? 'text-warning' : ''}
                >
                  {hasException ? 'Edit' : 'Exception'}
                </Button>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
};
