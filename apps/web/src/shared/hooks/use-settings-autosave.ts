import { Effect } from 'effect';
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Settings } from '../settings/schema';
import { saveSettings } from './use-settings-storage';

export type SaveStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved' }
  | { readonly kind: 'error'; readonly message: string };

// Wait for a pause in editing before writing, so a burst of toggles is one save.
const autosaveDelayMilliseconds = 600;

export const useSettingsAutosave = ({
  settingsRef,
  revisionRef,
  canSave,
}: {
  readonly settingsRef: RefObject<Settings>;
  readonly revisionRef: RefObject<string | null>;
  readonly canSave: boolean;
}) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: 'idle' });
  // Every edit bumps the version; a save covers the version it started from.
  const [version, setVersion] = useState(0);
  const [savingVersion, setSavingVersion] = useState<number | null>(null);
  const versionRef = useRef(version);
  versionRef.current = version;
  // Saves update these refs right away. When Next.js shows a kept screen again,
  // its effects can run before state from saves made while hidden arrives.
  // A failed version waits for the next edit or an explicit retry.
  const attemptedVersionRef = useRef(0);
  const savedVersionRef = useRef(0);
  // The edit version whose autosave timer is running, if any.
  const pendingVersionRef = useRef<number | null>(null);

  const save = useCallback(
    (editVersion: number): void => {
      attemptedVersionRef.current = editVersion;
      setSavingVersion(editVersion);
      Effect.runFork(
        saveSettings(settingsRef.current, revisionRef.current).pipe(
          Effect.tap((saved) =>
            Effect.sync(() => {
              revisionRef.current = saved.revision;
              savedVersionRef.current = editVersion;
              setSaveStatus({ kind: 'saved' });
            }),
          ),
          Effect.catch((error) =>
            Effect.sync(() =>
              setSaveStatus({ kind: 'error', message: error.message }),
            ),
          ),
          Effect.ensuring(Effect.sync(() => setSavingVersion(null))),
        ),
      );
    },
    [settingsRef, revisionRef],
  );

  useEffect(() => {
    pendingVersionRef.current = null;
    if (
      !canSave ||
      savingVersion !== null ||
      version <= attemptedVersionRef.current
    ) {
      return;
    }
    setSaveStatus({ kind: 'saving' });
    pendingVersionRef.current = version;
    const timer = setTimeout(() => {
      pendingVersionRef.current = null;
      save(version);
    }, autosaveDelayMilliseconds);
    return () => clearTimeout(timer);
  }, [version, savingVersion, canSave, save]);

  // Leaving the screen clears the autosave timer, so a waiting edit saves now.
  useEffect(
    () => () => {
      const pendingVersion = pendingVersionRef.current;
      if (pendingVersion !== null) {
        pendingVersionRef.current = null;
        save(pendingVersion);
      }
    },
    [save],
  );

  const bumpVersion = useCallback((): void => {
    setVersion((current) => current + 1);
  }, []);

  return { saveStatus, versionRef, savedVersionRef, bumpVersion };
};
