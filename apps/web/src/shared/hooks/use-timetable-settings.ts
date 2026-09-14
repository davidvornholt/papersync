import { type Dispatch, type SetStateAction, useCallback } from 'react';
import type { DayOfWeek, Settings, TimetableDay } from '../settings/schema';

export const setDaySubjects = (
  timetable: ReadonlyArray<TimetableDay>,
  day: DayOfWeek,
  subjectIds: ReadonlyArray<string>,
): Array<TimetableDay> =>
  timetable.some((entry) => entry.day === day)
    ? timetable.map((entry) =>
        entry.day === day ? { ...entry, subjectIds } : entry,
      )
    : [...timetable, { day, subjectIds }];

export const useTimetableSettings = (
  setSettings: Dispatch<SetStateAction<Settings>>,
) => {
  const updateTimetable = useCallback(
    (timetable: Array<TimetableDay>): void => {
      setSettings((prev) => ({ ...prev, timetable }));
    },
    [setSettings],
  );
  const addSubjectToDay = useCallback(
    (day: DayOfWeek, subjectId: string): void => {
      setSettings((prev) => {
        const current =
          prev.timetable.find((entry) => entry.day === day)?.subjectIds ?? [];
        return current.includes(subjectId)
          ? prev
          : {
              ...prev,
              timetable: setDaySubjects(prev.timetable, day, [
                ...current,
                subjectId,
              ]),
            };
      });
    },
    [setSettings],
  );
  const removeSubjectFromDay = useCallback(
    (day: DayOfWeek, subjectId: string): void => {
      setSettings((prev) => ({
        ...prev,
        timetable: prev.timetable.map((entry) =>
          entry.day === day
            ? {
                ...entry,
                subjectIds: entry.subjectIds.filter((id) => id !== subjectId),
              }
            : entry,
        ),
      }));
    },
    [setSettings],
  );
  return { updateTimetable, addSubjectToDay, removeSubjectFromDay };
};
