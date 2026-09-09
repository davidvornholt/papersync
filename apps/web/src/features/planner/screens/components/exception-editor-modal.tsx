'use client';

import { Button } from '@papersync/ui/button';
import { useEffect, useId, useState } from 'react';
import { Modal } from '@/shared/components/modal';
import type { DayOfWeek, ISODate, Subject } from '@/shared/types/schemas';
import type { ScheduleException } from '../planner-screen-types';
import { ExceptionSlotEditor } from './exception-slot-editor';

type ExceptionEditorModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly date: Date;
  readonly dayOfWeek: DayOfWeek;
  readonly subjects: ReadonlyArray<Subject>;
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
  const instanceId = useId();
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
          {exception ? (
            <Button
              variant="ghost"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="text-accent sm:mr-auto"
            >
              Remove exception
            </Button>
          ) : null}
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
            {exception ? 'Save changes' : 'Add exception'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label
            htmlFor={`${instanceId}-exception-reason`}
            className="field-label"
          >
            Reason (optional)
          </label>
          <input
            id={`${instanceId}-exception-reason`}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Field trip, Guest speaker, Exam"
            className="field-input placeholder:text-mute"
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
