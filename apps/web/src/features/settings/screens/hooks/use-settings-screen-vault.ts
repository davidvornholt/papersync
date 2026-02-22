'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Subject, TimetableDay } from '@/shared/hooks/use-settings';
import {
  loadSettingsFromVault,
  syncSettingsToVault,
} from '@/shared/services/vault-actions';
import type { GitHubRepository } from '../../actions/github-oauth-types';
import { useGitHubOAuth } from '../../hooks/use-github-oauth';
import type { UseSettingsScreenVaultProps } from './use-settings-screen-vault-types';
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
    async (accessToken: string): Promise<void> => {
      const { getGitHubUser } = await import('../../actions/github-oauth');
      const userResult = await getGitHubUser(accessToken);
      if (userResult.success) {
        updateVault({
          githubConnected: true,
          githubUsername: userResult.login,
          githubToken: accessToken,
        });
        addToast(
          `Connected to GitHub as ${userResult.name || userResult.login}!`,
          'success',
        );
      } else {
        updateVault({ githubConnected: true, githubToken: accessToken });
        addToast('Connected to GitHub successfully!', 'success');
      }
      setIsOAuthModalOpen(false);
      setIsRepoSelectorOpen(true);
    },
    [addToast, updateVault],
  );

  const handleRepoSelect = useCallback(
    async (repo: GitHubRepository): Promise<void> => {
      updateVault({ githubRepo: repo.fullName });
      setIsRepoSelectorOpen(false);
      const result = await loadSettingsFromVault('github', {
        githubToken: settings.vault.githubToken,
        githubRepo: repo.fullName,
      });
      if (!result.success) {
        addToast(`Selected repository: ${repo.fullName}`, 'success');
        return;
      }
      applyLoadedSettings(
        result.subjects as Subject[],
        result.timetable as TimetableDay[],
      );
      addToast(
        `Connected to ${repo.fullName} and loaded settings from vault`,
        'success',
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
  const handleSave = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    try {
      await save();
      if (!isVaultConfigured) {
        addToast('Settings saved successfully!', 'success');
        return;
      }
      setIsSyncing(true);
      try {
        const result = await syncSettingsToVault(
          { subjects: settings.subjects, timetable: settings.timetable },
          settings.vault.method,
          settings.vault,
        );
        addToast(
          result.success
            ? 'Settings saved and synced to vault!'
            : `Settings saved, but sync failed: ${result.error}`,
          result.success ? 'success' : 'warning',
        );
      } catch (error) {
        addToast(
          `Settings saved, but sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'warning',
        );
      } finally {
        setIsSyncing(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [addToast, isVaultConfigured, save, settings]);
  useEffect(() => {
    if (
      settings.vault.method !== 'local' ||
      !settings.vault.localPath ||
      settings.vault.localPath === lastLoadedLocalPath
    ) {
      return;
    }
    const load = async (): Promise<void> => {
      setIsLoadingVaultSettings(true);
      setLastLoadedLocalPath(settings.vault.localPath ?? '');
      try {
        const result = await loadSettingsFromVault('local', {
          localPath: settings.vault.localPath,
        });
        if (!result.success) {
          return;
        }
        applyLoadedSettings(
          result.subjects as Subject[],
          result.timetable as TimetableDay[],
        );
        if (result.subjects.length > 0 || result.timetable.length > 0) {
          addToast('Loaded settings from vault', 'success');
        }
      } finally {
        setIsLoadingVaultSettings(false);
      }
    };
    void load();
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
