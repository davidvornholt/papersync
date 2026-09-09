import { type Dispatch, type SetStateAction, useCallback } from 'react';
import type { Settings, Subject } from './use-settings-schema';

export const useSubjectSettings = (
  setSettings: Dispatch<SetStateAction<Settings>>,
) => {
  const addSubject = useCallback(
    (name: string): void => {
      setSettings((prev) => ({
        ...prev,
        subjects: [...prev.subjects, { id: `subj-${Date.now()}`, name }],
      }));
    },
    [setSettings],
  );
  const removeSubject = useCallback(
    (id: string): void => {
      setSettings((prev) => ({
        ...prev,
        subjects: prev.subjects.filter((subject) => subject.id !== id),
        timetable: prev.timetable.map((day) => ({
          ...day,
          slots: day.slots.filter((slot) => slot.subjectId !== id),
        })),
      }));
    },
    [setSettings],
  );
  const updateSubject = useCallback(
    (id: string, name: string): void => {
      setSettings((prev) => ({
        ...prev,
        subjects: prev.subjects.map((subject) =>
          subject.id === id ? { ...subject, name } : subject,
        ),
      }));
    },
    [setSettings],
  );
  const setSubjects = useCallback(
    (subjects: Array<Subject>): void => {
      setSettings((prev) => ({ ...prev, subjects }));
    },
    [setSettings],
  );
  return { addSubject, removeSubject, updateSubject, setSubjects };
};
