'use client';

import { Effect, Fiber } from 'effect';
import { useCallback, useEffect, useState } from 'react';
import {
  type DayOfWeek,
  defaultSettings,
  type Settings,
  type Subject,
  type TimetableDay,
} from './use-settings-schema';
import { loadSettings, saveSettings } from './use-settings-storage';
import { useSubjectSettings } from './use-subject-settings';
import { useTimetableSettings } from './use-timetable-settings';
export type UseSettingsReturn = {
  readonly settings: Settings;
  readonly isLoading: boolean;
  readonly updateAI: (updates: Partial<Settings['ai']>) => void;
  readonly addSubject: (name: string) => void;
  readonly removeSubject: (id: string) => void;
  readonly updateSubject: (id: string, name: string) => void;
  readonly setSubjects: (subjects: Array<Subject>) => void;
  readonly updateTimetable: (timetable: Array<TimetableDay>) => void;
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
    const fiber = Effect.runFork(
      loadSettings().pipe(
        Effect.tap((loaded) =>
          Effect.sync(() => {
            setSettings(loaded);
            setIsLoading(false);
          }),
        ),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);

  const updateAI = useCallback((updates: Partial<Settings['ai']>): void => {
    setSettings((prev) => ({ ...prev, ai: { ...prev.ai, ...updates } }));
  }, []);

  const save = useCallback(
    (): Promise<void> => Effect.runPromise(saveSettings(settings)),
    [settings],
  );

  const reset = useCallback((): void => {
    setSettings(defaultSettings);
    Effect.runFork(saveSettings(defaultSettings));
  }, []);

  const timetable = useTimetableSettings(setSettings);
  const subjects = useSubjectSettings(setSettings);
  return {
    ...timetable,
    ...subjects,
    settings,
    isLoading,
    updateAI,

    save,
    reset,
  };
};
