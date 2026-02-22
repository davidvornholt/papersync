'use client';

import { Effect } from 'effect';
import { useCallback, useEffect, useState } from 'react';
import type { Subject, TimetableDay } from '@/shared/hooks/use-settings';
import type { GitHubRepository } from '../../actions/github-oauth-types';
import { useGitHubOAuth } from '../../hooks/use-github-oauth';
import {
  createOAuthSuccessEffect,
  createRepoSelectEffect,
  createSaveSettingsEffect,
} from './settings-screen-vault-effects';
import { createLoadLocalVaultEffect } from './settings-screen-vault-load-local-effect';
import type { UseSettingsScreenVaultProps } from './use-settings-screen-vault-types';

const runEffect = (program: Effect.Effect<unknown, never, never>): void => {
  void Effect.runPromise(program);
};

export const useSettingsScreenVault = ({
  settings,
  save,
  updateVault,
  setSubjects,
  updateTimetable,
  isVaultConfigured,
  addToast,
}: UseSettingsScreenVaultProps) => {
  const {
    oauthState,
    startOAuth,
    cancelOAuth,
    reset: resetOAuth,
    isConfigured,
  } = useGitHubOAuth();

  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
  const [isRepoSelectorOpen, setIsRepoSelectorOpen] = useState(false);
  const [isLoadingVaultSettings, setIsLoadingVaultSettings] = useState(false);
  const [lastLoadedLocalPath, setLastLoadedLocalPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const applyLoadedSettings = useCallback(
    (
      subjects: readonly Subject[],
      timetable: readonly TimetableDay[],
    ): void => {
      if (subjects.length > 0) {
        setSubjects([...subjects]);
      }
      if (timetable.length > 0) {
        updateTimetable([...timetable]);
      }
    },
    [setSubjects, updateTimetable],
  );

  const handleConnect = (): void => {
    resetOAuth();
    setIsOAuthModalOpen(true);
  };

  const handleOAuthModalClose = (): void => {
    cancelOAuth();
    setIsOAuthModalOpen(false);
  };

  const handleOAuthSuccess = useCallback(
    (accessToken: string): void => {
      runEffect(
        createOAuthSuccessEffect({
          accessToken,
          updateVault,
          addToast,
          setIsOAuthModalOpen,
          setIsRepoSelectorOpen,
        }),
      );
    },
    [addToast, updateVault],
  );

  const handleRepoSelect = useCallback(
    (repo: GitHubRepository): void => {
      setIsRepoSelectorOpen(false);
      runEffect(
        createRepoSelectEffect({
          repo,
          githubToken: settings.vault.githubToken,
          updateVault,
          addToast,
          applyLoadedSettings,
        }),
      );
    },
    [addToast, applyLoadedSettings, settings.vault.githubToken, updateVault],
  );

  const handleDisconnect = (): void => {
    updateVault({
      githubConnected: false,
      githubRepo: '',
      githubUsername: '',
      githubToken: '',
    });
    addToast('Disconnected from GitHub', 'info');
  };

  const handleSave = useCallback((): void => {
    setIsSaving(true);
    runEffect(
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

    runEffect(
      createLoadLocalVaultEffect({
        localPath: settings.vault.localPath,
        addToast,
        applyLoadedSettings,
      }).pipe(
        Effect.ensuring(Effect.sync(() => setIsLoadingVaultSettings(false))),
      ),
    );
  }, [addToast, applyLoadedSettings, lastLoadedLocalPath, settings.vault]);

  return {
    oauthState,
    isOAuthConfigured: isConfigured,
    startOAuth,
    cancelOAuth,
    isOAuthModalOpen,
    isRepoSelectorOpen,
    isLoadingVaultSettings,
    isSaving,
    isSyncing,
    handleConnect,
    handleOAuthModalClose,
    handleOAuthSuccess,
    handleRepoSelect,
    handleDisconnect,
    handleSave,
    handleVaultMethodChange: (method: 'local' | 'github'): void =>
      updateVault({ method }),
    handleVaultPathChange: (localPath: string): void =>
      updateVault({ localPath }),
    handleOpenRepoSelector: (): void => setIsRepoSelectorOpen(true),
    handleCloseRepoSelector: (): void => setIsRepoSelectorOpen(false),
  };
};
