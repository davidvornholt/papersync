'use client';

import { useMemo, useState } from 'react';
import { Button, Modal } from '@/shared/components';
import type { WeekId } from '@/shared/types';
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
            Select Week
          </Button>
        </>
      }
    >
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {availableWeeks.map((week) => (
          <button
            key={week.weekId}
            type="button"
            onClick={() => setSelectedWeekId(week.weekId)}
            className={`w-full p-4 rounded-lg border text-left transition-all ${
              selectedWeekId === week.weekId
                ? 'border-accent bg-accent/10 ring-2 ring-accent/20'
                : 'border-border hover:border-accent/50 hover:bg-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{week.label}</p>
                <p className="text-sm text-muted">{week.dateRange}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-surface text-muted font-mono">
                {week.weekId}
              </span>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
};
