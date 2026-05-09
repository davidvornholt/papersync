'use client';

import { Button } from '@papersync/ui/button';
import { useMemo, useState } from 'react';
import { Modal } from '@/shared/components/modal';
import type { WeekId } from '@/shared/types/schemas';
import { getWeekId, getWeekStartDate } from '../../services/generator';

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
    const weeks: { weekId: WeekId; label: string; dateRange: string }[] = [];
    const today = new Date();

    for (let offset = -4; offset <= 8; offset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset * 7);
      const weekId = getWeekId(date);
      const startDate = getWeekStartDate(weekId);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const dateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
      };

      weeks.push({
        weekId,
        label:
          offset === 0
            ? 'This Week'
            : offset === 1
              ? 'Next Week'
              : offset === -1
                ? 'Last Week'
                : weekId,
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
                className={`relative w-full px-4 py-4 text-left transition-colors duration-200 cursor-pointer touch-manipulation border-b border-hairline ${
                  isSelected
                    ? 'bg-paper-deep'
                    : 'bg-transparent hover:bg-paper-deep/50 focus-visible:bg-paper-deep/50'
                }`}
              >
                {isSelected && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[2px] bg-accent"
                  />
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="serif text-[16px] tracking-[-0.018em] text-ink leading-tight">
                      {week.label}
                    </p>
                    <p className="text-[13px] text-graphite mt-0.5">
                      {week.dateRange}
                    </p>
                  </div>
                  <span className="mono text-[11px] tracking-[0.06em] text-graphite shrink-0">
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
