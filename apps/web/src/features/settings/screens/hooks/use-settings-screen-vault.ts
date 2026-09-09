'use client';

import { Effect } from 'effect';
import { useCallback, useState } from 'react';
import type {
  Subject,
  TimetableDay,
  VaultMethod,
} from '@/shared/hooks/use-settings-schema';
import type { GitHubRepository } from '../../actions/github-oauth-types';
import { useGitHubOAuth } from '../../hooks/use-github-oauth';
import {
  createOAuthSuccessEffect,
  createRepoSelectEffect,
} from './settings-screen-vault-effects';
import { useSettingsScreenSuperProductivity } from './use-settings-screen-super-productivity';
import type { UseSettingsScreenVaultProps } from './use-settings-screen-vault-types';
import { useVaultPersistence } from './use-vault-persistence';

const runEffect = (program: Effect.Effect<unknown, never, never>): void => {
  Effect.runFork(program);
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

  const superProductivity = useSettingsScreenSuperProductivity({
    settings,
    updateVault,
  });

  const applyLoadedSettings = useCallback(
    (
      subjects: ReadonlyArray<Subject>,
      timetable: ReadonlyArray<TimetableDay>,
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

  const { isLoadingVaultSettings, isSaving, isSyncing, handleSave } =
    useVaultPersistence({
      settings,
      save,
      isVaultConfigured,
      addToast,
      applyLoadedSettings,
    });

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
    handleVaultMethodChange: (method: VaultMethod): void =>
      updateVault({ method }),
    handleVaultPathChange: (localPath: string): void =>
      updateVault({ localPath }),
    handleOpenRepoSelector: (): void => setIsRepoSelectorOpen(true),
    handleCloseRepoSelector: (): void => setIsRepoSelectorOpen(false),
    ...superProductivity,
  };
};
