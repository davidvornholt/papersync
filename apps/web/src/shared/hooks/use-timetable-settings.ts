import { type Dispatch, type SetStateAction, useCallback } from 'react';
import type { DayOfWeek, Settings, TimetableDay } from './use-settings-schema';

export const useTimetableSettings = (
  setSettings: Dispatch<SetStateAction<Settings>>,
) => {
  const updateTimetable = useCallback(
    (timetable: Array<TimetableDay>): void => {
      setSettings((prev) => ({ ...prev, timetable }));
    },
    [setSettings],
  );
  const addTimetableSlot = useCallback(
    (day: DayOfWeek, subjectId: string): void => {
      setSettings((prev) => {
        const dayExists = prev.timetable.some(
          (timetableDay) => timetableDay.day === day,
        );
        const newSlot = { id: `slot-${Date.now()}`, subjectId };

        if (dayExists) {
          return {
            ...prev,
            timetable: prev.timetable.map((timetableDay) =>
              timetableDay.day === day
                ? { ...timetableDay, slots: [...timetableDay.slots, newSlot] }
                : timetableDay,
            ),
          };
        }

        return {
          ...prev,
          timetable: [...prev.timetable, { day, slots: [newSlot] }],
        };
      });
    },
    [setSettings],
  );
  const removeTimetableSlot = useCallback(
    (day: DayOfWeek, slotId: string): void => {
      setSettings((prev) => ({
        ...prev,
        timetable: prev.timetable.map((timetableDay) =>
          timetableDay.day === day
            ? {
                ...timetableDay,
                slots: timetableDay.slots.filter((slot) => slot.id !== slotId),
              }
            : timetableDay,
        ),
      }));
    },
    [setSettings],
  );
  const updateTimetableSlot = useCallback(
    (day: DayOfWeek, slotId: string, subjectId: string): void => {
      setSettings((prev) => ({
        ...prev,
        timetable: prev.timetable.map((timetableDay) =>
          timetableDay.day === day
            ? {
                ...timetableDay,
                slots: timetableDay.slots.map((slot) =>
                  slot.id === slotId ? { ...slot, subjectId } : slot,
                ),
              }
            : timetableDay,
        ),
      }));
    },
    [setSettings],
  );
  return {
    updateTimetable,
    addTimetableSlot,
    removeTimetableSlot,
    updateTimetableSlot,
  };
};
