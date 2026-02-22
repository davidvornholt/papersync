'use client';

import { Effect } from 'effect';
import { useCallback, useEffect, useState } from 'react';
import {
  type AIProvider,
  DAYS_OF_WEEK,
  type DayOfWeek,
  defaultSettings,
  type Settings,
  type Subject,
  type TimetableDay,
  type TimetableSlot,
  type VaultMethod,
} from './use-settings-schema';
import { loadSettings, saveSettings } from './use-settings-storage';

export type UseSettingsReturn = {
  readonly settings: Settings;
  readonly isLoading: boolean;
  readonly updateVault: (updates: Partial<Settings['vault']>) => void;
  readonly updateAI: (updates: Partial<Settings['ai']>) => void;
  readonly addSubject: (name: string) => void;
  readonly removeSubject: (id: string) => void;
  readonly updateSubject: (id: string, name: string) => void;
  readonly setSubjects: (subjects: Subject[]) => void;
  readonly updateTimetable: (timetable: TimetableDay[]) => void;
  readonly addTimetableSlot: (day: DayOfWeek, subjectId: string) => void;
  readonly removeTimetableSlot: (day: DayOfWeek, slotId: string) => void;
  readonly updateTimetableSlot: (
    day: DayOfWeek,
    slotId: string,
    subjectId: string,
  ) => void;
  readonly save: () => Promise<void>;
  readonly reset: () => void;
};

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Effect.runPromise(loadSettings()).then((loaded) => {
      setSettings(loaded);
      setIsLoading(false);
    });
  }, []);

  const updateVault = useCallback(
    (updates: Partial<Settings['vault']>): void => {
      setSettings((prev) => ({
        ...prev,
        vault: { ...prev.vault, ...updates },
      }));
    },
    [],
  );

  const updateAI = useCallback((updates: Partial<Settings['ai']>): void => {
    setSettings((prev) => ({ ...prev, ai: { ...prev.ai, ...updates } }));
  }, []);

  const addSubject = useCallback((name: string): void => {
    setSettings((prev) => ({
      ...prev,
      subjects: [...prev.subjects, { id: `subj-${Date.now()}`, name }],
    }));
  }, []);

  const removeSubject = useCallback((id: string): void => {
    setSettings((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((subject) => subject.id !== id),
      timetable: prev.timetable.map((day) => ({
        ...day,
        slots: day.slots.filter((slot) => slot.subjectId !== id),
      })),
    }));
  }, []);

  const updateSubject = useCallback((id: string, name: string): void => {
    setSettings((prev) => ({
      ...prev,
      subjects: prev.subjects.map((subject) =>
        subject.id === id ? { ...subject, name } : subject,
      ),
    }));
  }, []);

  const setSubjects = useCallback((subjects: Subject[]): void => {
    setSettings((prev) => ({ ...prev, subjects }));
  }, []);

  const updateTimetable = useCallback((timetable: TimetableDay[]): void => {
    setSettings((prev) => ({ ...prev, timetable }));
  }, []);

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
    [],
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
    [],
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
    [],
  );

  const save = useCallback(async (): Promise<void> => {
    await Effect.runPromise(saveSettings(settings));
  }, [settings]);

  const reset = useCallback((): void => {
    setSettings(defaultSettings);
    Effect.runPromise(saveSettings(defaultSettings));
  }, []);

  return {
    settings,
    isLoading,
    updateVault,
    updateAI,
    addSubject,
    removeSubject,
    updateSubject,
    setSubjects,
    updateTimetable,
    addTimetableSlot,
    removeTimetableSlot,
    updateTimetableSlot,
    save,
    reset,
  };
};

export type {
  AIProvider,
  DayOfWeek,
  Settings,
  Subject,
  TimetableDay,
  TimetableSlot,
  VaultMethod,
};

export { DAYS_OF_WEEK };
