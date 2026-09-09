'use client';

import { Button } from '@papersync/ui/button';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
  DAYS_OF_WEEK,
  type DayOfWeek,
  type Subject,
  type TimetableDay,
} from '@/shared/hooks/use-settings-schema';

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
  readonly onAddSlot: (day: DayOfWeek, subjectId: string) => void;
  readonly onRemoveSlot: (day: DayOfWeek, slotId: string) => void;
  readonly onUpdateSlot: (
    day: DayOfWeek,
    slotId: string,
    subjectId: string,
  ) => void;
};

export const TimetableConfigPanel = ({
  subjects,
  timetable,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
}: TimetableConfigPanelProps): React.ReactElement => {
  const [activeDay, setActiveDay] = useState<DayOfWeek>('monday');
  const activeSchedule = timetable.find((day) => day.day === activeDay);

  return (
    <div className="flex flex-col gap-5 md:flex-row md:gap-6">
      <div
        role="tablist"
        aria-label="Days of the week"
        className="scrollbar-hide -mx-1 flex overflow-x-auto md:mx-0 md:w-28 md:shrink-0 md:flex-col md:overflow-visible"
      >
        {WEEKDAY_KEYS.map((day) => {
          const isActive = activeDay === day;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveDay(day)}
              className={`mono relative flex-1 cursor-pointer touch-manipulation px-3 py-2 text-center text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 md:flex-none md:text-left ${
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
            </button>
          );
        })}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-baseline justify-between">
          <h4 className="serif text-[18px] text-ink tracking-[-0.022em]">
            {DAY_LABELS[activeDay]}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              subjects.length > 0 && onAddSlot(activeDay, subjects[0].id)
            }
            disabled={subjects.length === 0}
          >
            Add class
          </Button>
        </div>

        {!activeSchedule || activeSchedule.slots.length === 0 ? (
          <div className="border border-hairline-strong border-dashed py-6 text-center text-graphite">
            <p className="serif-italic text-[14px]">
              No classes on {DAY_LABELS[activeDay]}
            </p>
          </div>
        ) : (
          <ul className="-mx-1">
            <AnimatePresence>
              {activeSchedule.slots.map((slot, index) => (
                <motion.li
                  key={slot.id}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3 border-hairline border-b px-1 py-2 last:border-b-0"
                >
                  <span className="mono w-6 text-right text-[11px] text-graphite">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <select
                    value={slot.subjectId}
                    onChange={(e) =>
                      onUpdateSlot(activeDay, slot.id, e.target.value)
                    }
                    className="flex-1 cursor-pointer border-0 border-hairline-strong border-b bg-transparent px-0 py-2 text-[14px] text-ink focus:border-ink focus:outline-none"
                  >
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveSlot(activeDay, slot.id)}
                    className="mono cursor-pointer touch-manipulation px-2 py-1 text-[10px] text-graphite uppercase tracking-[0.18em] transition-colors hover:text-accent"
                    aria-label="Remove class"
                  >
                    Remove
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
};
