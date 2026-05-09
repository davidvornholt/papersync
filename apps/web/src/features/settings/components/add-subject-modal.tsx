'use client';

import { Button } from '@papersync/ui/button';
import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@/shared/components/modal';
import type { Subject } from '@/shared/hooks/use-settings';

type AddSubjectModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onAdd: (name: string) => void;
  readonly editingSubject?: Subject | null;
  readonly onEdit?: (id: string, name: string) => void;
  readonly existingSubjects: readonly Subject[];
};

export const AddSubjectModal = ({
  isOpen,
  onClose,
  onAdd,
  editingSubject,
  onEdit,
  existingSubjects,
}: AddSubjectModalProps): React.ReactElement => {
  const [name, setName] = useState(editingSubject?.name ?? '');

  const isDuplicate = useCallback(
    (nextName: string): boolean => {
      const normalizedName = nextName.trim().toLowerCase();
      return existingSubjects.some(
        (subject) =>
          subject.name.toLowerCase() === normalizedName &&
          subject.id !== editingSubject?.id,
      );
    },
    [existingSubjects, editingSubject?.id],
  );

  useEffect(() => {
    if (isOpen) {
      setName(editingSubject?.name ?? '');
    }
  }, [isOpen, editingSubject]);

  const hasDuplicate = name.trim() !== '' && isDuplicate(name);
  const showError =
    hasDuplicate &&
    name.trim().toLowerCase() !== (editingSubject?.name ?? '').toLowerCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSubject ? 'Edit subject' : 'Add subject'}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || hasDuplicate}
            onClick={() => {
              const trimmedName = name.trim();
              if (!trimmedName || hasDuplicate) {
                return;
              }

              if (editingSubject && onEdit) {
                onEdit(editingSubject.id, trimmedName);
              } else {
                onAdd(trimmedName);
              }

              setName('');
              onClose();
            }}
          >
            {editingSubject ? 'Save changes' : 'Add subject'}
          </Button>
        </>
      }
    >
      <div>
        <label htmlFor="subject-name" className="field-label">
          Subject name
        </label>
        <input
          id="subject-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Mathematics"
          className={`field-input placeholder:text-mute ${
            showError ? 'border-b-accent focus:border-b-accent' : ''
          }`}
        />
        {showError && (
          <p className="mt-2 text-[13px] text-accent">
            A subject named “{name.trim()}” already exists
          </p>
        )}
      </div>
    </Modal>
  );
};
