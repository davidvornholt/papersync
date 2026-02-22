'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from '@/shared/components';
import type { DayOfWeek, ISODate, Subject } from '@/shared/types';
import type { ScheduleException } from '../planner-screen-types';
import { ExceptionSlotEditor } from './exception-slot-editor';

type ExceptionEditorModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly date: Date;
  readonly dayOfWeek: DayOfWeek;
  readonly subjects: readonly Subject[];
  readonly defaultSlots: Array<{ id: string; subjectId: string }>;
  readonly exception: ScheduleException | null;
  readonly onSave: (exception: Omit<ScheduleException, 'id'>) => void;
  readonly onRemove: () => void;
};

export const ExceptionEditorModal = ({
  isOpen,
  onClose,
  date,
  dayOfWeek,
  subjects,
  defaultSlots,
  exception,
  onSave,
  onRemove,
}: ExceptionEditorModalProps): React.ReactElement => {
  const [slots, setSlots] = useState(exception?.slots ?? defaultSlots);
  const [reason, setReason] = useState(exception?.reason ?? '');

  useEffect(() => {
    if (isOpen) {
      setSlots(exception?.slots ?? defaultSlots);
      setReason(exception?.reason ?? '');
    }
  }, [isOpen, exception, defaultSlots]);

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={exception ? 'Edit Exception' : 'Add Exception'}
      description={`Modify the schedule for ${dateStr}`}
      size="md"
      footer={
        <>
          {exception && (
            <Button
              variant="ghost"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="mr-auto text-red-500 hover:text-red-600"
            >
              Remove Exception
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const isoDate = date.toISOString().split('T')[0] as ISODate;
              onSave({
                date: isoDate,
                dayOfWeek,
                reason: reason.trim() || undefined,
                slots,
              });
              onClose();
            }}
          >
            {exception ? 'Save Changes' : 'Add Exception'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="exception-reason"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Reason (optional)
          </label>
          <input
            id="exception-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Field trip, Guest speaker, Exam"
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
          />
        </div>

        <ExceptionSlotEditor
          slots={slots}
          subjects={subjects}
          onAddSlot={() => {
            if (subjects.length > 0) {
              setSlots((prev) => [
                ...prev,
                { id: `slot-${Date.now()}`, subjectId: subjects[0].id },
              ]);
            }
          }}
          onChangeSlot={(slotId, subjectId) => {
            setSlots((prev) =>
              prev.map((slot) =>
                slot.id === slotId ? { ...slot, subjectId } : slot,
              ),
            );
          }}
          onRemoveSlot={(slotId) => {
            setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
          }}
        />
      </div>
    </Modal>
  );
};
