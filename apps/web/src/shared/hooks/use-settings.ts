'use client';

import { Effect, Fiber } from 'effect';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type DayOfWeek,
  defaultSettings,
  type Settings,
  type Subject,
  type TimetableDay,
} from '../settings/schema';
import { type SaveStatus, useSettingsAutosave } from './use-settings-autosave';
import { loadSettings } from './use-settings-storage';
import { useSubjectSettings } from './use-subject-settings';
import { useTimetableSettings } from './use-timetable-settings';

export type UseSettingsReturn = {
  readonly settings: Settings;
  readonly isLoading: boolean;
  readonly loadError: string | null;
  readonly saveStatus: SaveStatus;
  readonly retrySave: () => void;
  readonly updateAI: (updates: Partial<Settings['ai']>) => void;
  readonly addSubject: (name: string) => void;
  readonly removeSubject: (id: string) => void;
  readonly updateSubject: (id: string, name: string) => void;
  readonly setSubjects: (subjects: Array<Subject>) => void;
  readonly updateTimetable: (timetable: Array<TimetableDay>) => void;
  readonly addSubjectToDay: (day: DayOfWeek, subjectId: string) => void;
  readonly removeSubjectFromDay: (day: DayOfWeek, subjectId: string) => void;
};

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const revisionRef = useRef<string | null>(null);
  const latestSettingsRef = useRef(settings);
  latestSettingsRef.current = settings;
  const { saveStatus, versionRef, savedVersionRef, bumpVersion } =
    useSettingsAutosave({
      settingsRef: latestSettingsRef,
      revisionRef,
      canSave: !(isLoading || loadError),
    });

  useEffect(() => {
    // Next.js keeps a left screen and runs this again when it returns. Edits
    // that are not saved yet stay on screen instead of the stored settings.
    const loadVersion = versionRef.current;
    if (loadVersion !== savedVersionRef.current) {
      return;
    }
    const fiber = Effect.runFork(
      loadSettings().pipe(
        Effect.tap((loaded) =>
          Effect.sync(() => {
            if (versionRef.current === loadVersion) {
              revisionRef.current = loaded.revision;
              setSettings(loaded.settings);
            }
            setIsLoading(false);
          }),
        ),
        Effect.catch((error) =>
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
  }, [versionRef, savedVersionRef]);

  const edit: Dispatch<SetStateAction<Settings>> = useCallback(
    (update) => {
      setSettings(update);
      bumpVersion();
    },
    [bumpVersion],
  );

  const updateAI = useCallback(
    (updates: Partial<Settings['ai']>): void => {
      edit((prev) => ({ ...prev, ai: { ...prev.ai, ...updates } }));
    },
    [edit],
  );

  const timetable = useTimetableSettings(edit);
  const subjects = useSubjectSettings(edit);
  return {
    ...timetable,
    ...subjects,
    settings,
    isLoading,
    loadError,
    saveStatus,
    retrySave: bumpVersion,
    updateAI,
  };
};
