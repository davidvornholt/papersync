'use client';

import { Effect, Fiber } from 'effect';
import { useCallback, useEffect, useState } from 'react';
import {
  type DayOfWeek,
  defaultSettings,
  type Settings,
  type Subject,
  type TimetableDay,
} from '../settings/schema';
import { SettingsStorageError } from './settings-storage-error';
import { loadSettings, saveSettings } from './use-settings-storage';
import { useSubjectSettings } from './use-subject-settings';
import { useTimetableSettings } from './use-timetable-settings';
export type UseSettingsReturn = {
  readonly settings: Settings;
  readonly isLoading: boolean;
  readonly loadError: string | null;
  readonly updateAI: (updates: Partial<Settings['ai']>) => void;
  readonly addSubject: (name: string) => void;
  readonly removeSubject: (id: string) => void;
  readonly updateSubject: (id: string, name: string) => void;
  readonly setSubjects: (subjects: Array<Subject>) => void;
  readonly updateTimetable: (timetable: Array<TimetableDay>) => void;
  readonly addTimetableSlot: (day: DayOfWeek, subjectId: string | null) => void;
  readonly removeTimetableSlot: (day: DayOfWeek, slotId: string) => void;
  readonly updateTimetableSlot: (
    day: DayOfWeek,
    slotId: string,
    subjectId: string | null,
  ) => void;
  readonly save: () => Effect.Effect<void, SettingsStorageError>;
};

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState<string | null>(null);

  useEffect(() => {
    const fiber = Effect.runFork(
      loadSettings().pipe(
        Effect.tap((loaded) =>
          Effect.sync(() => {
            setSettings(loaded.settings);
            setRevision(loaded.revision);
            setIsLoading(false);
          }),
        ),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            setLoadError(error.message);
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
    (): Effect.Effect<void, SettingsStorageError> =>
      isLoading || loadError
        ? Effect.fail(
            new SettingsStorageError({
              message: 'Reload your timetable before saving.',
            }),
          )
        : saveSettings(settings, revision).pipe(
            Effect.tap((saved) =>
              Effect.sync(() => setRevision(saved.revision)),
            ),
            Effect.asVoid,
          ),
    [settings, revision, isLoading, loadError],
  );

  const timetable = useTimetableSettings(setSettings);
  const subjects = useSubjectSettings(setSettings);
  return {
    ...timetable,
    ...subjects,
    settings,
    isLoading,
    loadError,
    updateAI,

    save,
  };
};
