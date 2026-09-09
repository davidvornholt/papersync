'use client';

import { Button } from '@papersync/ui/button';
import { useMemo, useState } from 'react';
import { Modal } from '@/shared/components/modal';
import { getWeekId, getWeekStartDate } from '@/shared/planner/week';
import type { WeekId } from '@/shared/types/schemas';

const weekLabels: Readonly<Record<number, string>> = {
  0: 'This week',
  1: 'Next week',
  '-1': 'Last week',
};
const previousWeeks = 4;
const upcomingWeeks = 8;
const daysPerWeek = 7;
const sundayOffset = 6;
type WeekSelectionModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentWeekId: WeekId;
  readonly onSelect: (weekId: WeekId) => void;
};

export const WeekSelectionModal = ({
  isOpen,
  onClose,
  currentWeekId,
  onSelect,
}: WeekSelectionModalProps): React.ReactElement => {
  const [selectedWeekId, setSelectedWeekId] = useState<WeekId>(currentWeekId);

  const availableWeeks = useMemo(() => {
    const weeks: Array<{ weekId: WeekId; label: string; dateRange: string }> =
      [];
    const today = new Date();

    for (let offset = -previousWeeks; offset <= upcomingWeeks; offset += 1) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset * daysPerWeek);
      const weekId = getWeekId(date);
      const startDate = getWeekStartDate(weekId);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + sundayOffset);

      const dateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
      };

      weeks.push({
        weekId,
        label: weekLabels[offset] ?? weekId,
        dateRange: `${startDate.toLocaleDateString('en-US', dateOptions)} – ${endDate.toLocaleDateString('en-US', { ...dateOptions, year: 'numeric' })}`,
      });
    }

    return weeks;
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Week"
      description="Choose a week for your planner"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSelect(selectedWeekId);
              onClose();
            }}
          >
            Select week
          </Button>
        </>
      }
    >
      <ul className="-mx-1 max-h-[60vh] overflow-y-auto">
        {availableWeeks.map((week) => {
          const isSelected = selectedWeekId === week.weekId;
          return (
            <li key={week.weekId}>
              <button
                type="button"
                onClick={() => setSelectedWeekId(week.weekId)}
                className={`relative w-full cursor-pointer touch-manipulation border-hairline border-b p-4 text-left transition-colors duration-200 ${
                  isSelected
                    ? 'bg-paper-deep'
                    : 'bg-transparent hover:bg-paper-deep/50 focus-visible:bg-paper-deep/50'
                }`}
              >
                {isSelected ? (
                  <span
                    aria-hidden={true}
                    className="absolute inset-y-0 left-0 w-[2px] bg-accent"
                  />
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="serif text-[16px] text-ink leading-tight tracking-[-0.018em]">
                      {week.label}
                    </p>
                    <p className="mt-0.5 text-[13px] text-graphite">
                      {week.dateRange}
                    </p>
                  </div>
                  <span className="mono shrink-0 text-[11px] text-graphite tracking-[0.06em]">
                    {week.weekId}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
};
