'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Modal } from '@/shared/components';
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
      title={editingSubject ? 'Edit Subject' : 'Add Subject'}
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
            {editingSubject ? 'Save Changes' : 'Add Subject'}
          </Button>
        </>
      }
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Subject name"
        className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:border-transparent ${
          showError
            ? 'border-red-500 focus:ring-red-500'
            : 'border-border focus:ring-accent'
        }`}
      />
      {showError && (
        <p className="mt-2 text-sm text-red-500">
          A subject named "{name.trim()}" already exists
        </p>
      )}
    </Modal>
  );
};
