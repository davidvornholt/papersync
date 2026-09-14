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
import { loadSettings, saveSettings } from './use-settings-storage';
import { useSubjectSettings } from './use-subject-settings';
import { useTimetableSettings } from './use-timetable-settings';

export type SaveStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved' }
  | { readonly kind: 'error'; readonly message: string };

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

// Wait for a pause in editing before writing, so a burst of toggles is one save.
const autosaveDelayMilliseconds = 600;

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: 'idle' });
  // Every edit bumps the version; a save covers the version it started from.
  const [version, setVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const [savingVersion, setSavingVersion] = useState<number | null>(null);
  // A failed version waits for the next edit or an explicit retry.
  const [failedVersion, setFailedVersion] = useState<number | null>(null);
  const revisionRef = useRef<string | null>(null);
  const latestSettingsRef = useRef(settings);
  latestSettingsRef.current = settings;

  useEffect(() => {
    const fiber = Effect.runFork(
      loadSettings().pipe(
        Effect.tap((loaded) =>
          Effect.sync(() => {
            revisionRef.current = loaded.revision;
            setSettings(loaded.settings);
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

  useEffect(() => {
    if (
      isLoading ||
      loadError ||
      savingVersion !== null ||
      version === savedVersion ||
      version === failedVersion
    ) {
      return;
    }
    setSaveStatus({ kind: 'saving' });
    const timer = setTimeout(() => {
      setSavingVersion(version);
      Effect.runFork(
        saveSettings(latestSettingsRef.current, revisionRef.current).pipe(
          Effect.tap((saved) =>
            Effect.sync(() => {
              revisionRef.current = saved.revision;
              setSavedVersion(version);
              setFailedVersion(null);
              setSaveStatus({ kind: 'saved' });
            }),
          ),
          Effect.catchAll((error) =>
            Effect.sync(() => {
              setFailedVersion(version);
              setSaveStatus({ kind: 'error', message: error.message });
            }),
          ),
          Effect.ensuring(Effect.sync(() => setSavingVersion(null))),
        ),
      );
    }, autosaveDelayMilliseconds);
    return () => clearTimeout(timer);
  }, [
    version,
    savedVersion,
    savingVersion,
    failedVersion,
    isLoading,
    loadError,
  ]);

  const edit: Dispatch<SetStateAction<Settings>> = useCallback((update) => {
    setSettings(update);
    setVersion((current) => current + 1);
  }, []);

  const retrySave = useCallback((): void => {
    setVersion((current) => current + 1);
  }, []);

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
    retrySave,
    updateAI,
  };
};
