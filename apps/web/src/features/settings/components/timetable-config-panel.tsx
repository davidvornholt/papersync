'use client';

import { useState } from 'react';
import { SubjectPicker } from '@/shared/components/subject-picker';
import {
  DAYS_OF_WEEK,
  type DayOfWeek,
  type Subject,
  type TimetableDay,
} from '@/shared/settings/schema';

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const WEEKDAY_KEYS = DAYS_OF_WEEK.filter(
  (day) => day !== 'saturday' && day !== 'sunday',
);

type TimetableConfigPanelProps = {
  readonly subjects: ReadonlyArray<Subject>;
  readonly timetable: ReadonlyArray<TimetableDay>;
  readonly onAddSubjectToDay: (day: DayOfWeek, subjectId: string) => void;
  readonly onRemoveSubjectFromDay: (day: DayOfWeek, subjectId: string) => void;
};

export const TimetableConfigPanel = ({
  subjects,
  timetable,
  onAddSubjectToDay,
  onRemoveSubjectFromDay,
}: TimetableConfigPanelProps): React.ReactElement => {
  const [activeDay, setActiveDay] = useState<DayOfWeek>('monday');
  const selectedIds =
    timetable.find((day) => day.day === activeDay)?.subjectIds ?? [];

  return (
    <div className="flex flex-col gap-5 md:flex-row md:gap-6">
      <div
        role="tablist"
        aria-label="Days of the week"
        className="scrollbar-hide -mx-1 flex overflow-x-auto md:mx-0 md:w-28 md:shrink-0 md:flex-col md:overflow-visible"
      >
        {WEEKDAY_KEYS.map((day) => {
          const isActive = activeDay === day;
          const count =
            timetable.find((entry) => entry.day === day)?.subjectIds.length ??
            0;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveDay(day)}
              className={`mono relative flex flex-1 cursor-pointer touch-manipulation items-baseline justify-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 md:flex-none md:justify-start md:text-left ${
                isActive
                  ? 'text-ink'
                  : 'text-graphite hover:text-ink focus-visible:text-ink'
              }`}
            >
              {isActive ? (
                <span
                  aria-hidden={true}
                  className="absolute inset-x-2 bottom-0 h-[2px] bg-accent md:inset-y-0 md:left-0 md:h-auto md:w-[2px]"
                />
              ) : null}
              {DAY_SHORT_LABELS[day]}
              {count > 0 ? (
                <span aria-hidden={true} className="text-[10px] text-graphite">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="serif mb-3 text-[18px] text-ink tracking-[-0.022em]">
          {DAY_LABELS[activeDay]}
        </h4>
        {subjects.length === 0 ? (
          <div className="border border-hairline-strong border-dashed py-6 text-center text-graphite">
            <p className="serif-italic text-[14px]">
              Add a subject first, then place it on a day.
            </p>
          </div>
        ) : (
          <SubjectPicker
            scope={DAY_LABELS[activeDay]}
            subjects={subjects}
            selectedIds={selectedIds}
            onAdd={(subjectId) => onAddSubjectToDay(activeDay, subjectId)}
            onRemove={(subjectId) =>
              onRemoveSubjectFromDay(activeDay, subjectId)
            }
            emptyLabel={`No classes on ${DAY_LABELS[activeDay]}`}
          />
        )}
      </div>
    </div>
  );
};
