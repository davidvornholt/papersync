'use client';

import { Button } from '@papersync/ui/button';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type {
  DayOfWeek,
  Subject,
  TimetableDay,
} from '@/shared/hooks/use-settings';
import { DAYS_OF_WEEK } from '@/shared/hooks/use-settings';

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
  readonly subjects: readonly Subject[];
  readonly timetable: readonly TimetableDay[];
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
        className="flex md:flex-col md:w-28 md:shrink-0 -mx-1 md:mx-0 overflow-x-auto md:overflow-visible scrollbar-hide"
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
              className={`relative flex-1 md:flex-none px-3 py-2 mono text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 cursor-pointer touch-manipulation text-center md:text-left ${
                isActive
                  ? 'text-ink'
                  : 'text-graphite hover:text-ink focus-visible:text-ink'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute md:left-0 md:top-0 md:bottom-0 md:w-[2px] md:h-auto bottom-0 left-2 right-2 h-[2px] bg-accent"
                />
              )}
              {DAY_SHORT_LABELS[day]}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="serif text-[18px] tracking-[-0.022em] text-ink">
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
          <div className="text-center py-6 text-graphite border border-dashed border-hairline-strong">
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
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3 px-1 py-2 border-b border-hairline last:border-b-0"
                >
                  <span className="mono text-[11px] text-graphite w-6 text-right">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <select
                    value={slot.subjectId}
                    onChange={(e) =>
                      onUpdateSlot(activeDay, slot.id, e.target.value)
                    }
                    className="flex-1 bg-transparent border-0 border-b border-hairline-strong px-0 py-2 text-[14px] text-ink focus:outline-none focus:border-ink cursor-pointer"
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
                    className="px-2 py-1 mono text-[10px] uppercase tracking-[0.18em] text-graphite hover:text-accent transition-colors cursor-pointer touch-manipulation"
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
