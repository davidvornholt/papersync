'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/shared/components';
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
    <div className="flex flex-col md:flex-row gap-4">
      <div className="md:w-28 shrink-0 flex md:flex-col gap-1 overflow-x-auto">
        {DAYS_OF_WEEK.filter(
          (day) => day !== 'saturday' && day !== 'sunday',
        ).map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setActiveDay(day)}
            className={`px-4 py-2 rounded-lg ${
              activeDay === day
                ? 'bg-accent text-white'
                : 'hover:bg-surface text-foreground bg-surface md:bg-transparent'
            }`}
          >
            {DAY_SHORT_LABELS[day]}
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">
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
            Add Class
          </Button>
        </div>

        {!activeSchedule || activeSchedule.slots.length === 0 ? (
          <div className="text-center py-6 text-muted border-2 border-dashed border-border rounded-lg">
            <p className="text-sm">No classes on {DAY_LABELS[activeDay]}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {activeSchedule.slots.map((slot, index) => (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border"
                >
                  <span className="text-xs text-muted bg-surface w-6 h-6 rounded flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <select
                    value={slot.subjectId}
                    onChange={(e) =>
                      onUpdateSlot(activeDay, slot.id, e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
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
                    className="p-2 text-muted hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
