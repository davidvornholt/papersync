'use client';

import { Effect } from 'effect';
import { useCallback, useEffect, useState } from 'react';
import type { Subject, TimetableDay } from '@/shared/hooks/use-settings-schema';
import { createLoadLocalVaultEffect } from './settings-screen-vault-load-local-effect';
import { createSaveSettingsEffect } from './settings-screen-vault-save-effect';
import type { UseSettingsScreenVaultProps } from './use-settings-screen-vault-types';

type PersistenceOptions = Pick<
  UseSettingsScreenVaultProps,
  'settings' | 'save' | 'isVaultConfigured' | 'addToast'
> & {
  readonly applyLoadedSettings: (
    subjects: ReadonlyArray<Subject>,
    timetable: ReadonlyArray<TimetableDay>,
  ) => void;
};
export const useVaultPersistence = ({
  settings,
  save,
  isVaultConfigured,
  addToast,
  applyLoadedSettings,
}: PersistenceOptions) => {
  const [isLoadingVaultSettings, setIsLoadingVaultSettings] = useState(false);
  const [lastLoadedLocalPath, setLastLoadedLocalPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const handleSave = useCallback((): void => {
    setIsSaving(true);
    Effect.runFork(
      createSaveSettingsEffect({
        save,
        settings,
        isVaultConfigured,
        addToast,
        setIsSyncing,
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            setIsSaving(false);
            setIsSyncing(false);
          }),
        ),
      ),
    );
  }, [addToast, isVaultConfigured, save, settings]);

  useEffect(() => {
    if (
      settings.vault.method !== 'local' ||
      !settings.vault.localPath ||
      settings.vault.localPath === lastLoadedLocalPath
    ) {
      return;
    }

    setIsLoadingVaultSettings(true);
    setLastLoadedLocalPath(settings.vault.localPath);

    Effect.runFork(
      createLoadLocalVaultEffect({
        localPath: settings.vault.localPath,
        addToast,
        applyLoadedSettings,
      }).pipe(
        Effect.ensuring(Effect.sync(() => setIsLoadingVaultSettings(false))),
      ),
    );
  }, [addToast, applyLoadedSettings, lastLoadedLocalPath, settings.vault]);

  return { isLoadingVaultSettings, isSaving, isSyncing, handleSave };
};
