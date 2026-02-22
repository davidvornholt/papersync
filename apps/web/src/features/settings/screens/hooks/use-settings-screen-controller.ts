'use client';

import { useState } from 'react';
import { useToast } from '@/shared/components';
import type { Subject } from '@/shared/hooks/use-settings';
import { useSettings } from '@/shared/hooks/use-settings';
import {
  getConfiguredDaysCount,
  isVaultConfigured,
} from '../settings-screen-helpers';
import { useSettingsScreenVault } from './use-settings-screen-vault';

export const useSettingsScreenController = () => {
  const settingsApi = useSettings();
  const { addToast } = useToast();
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const vaultConfigured = isVaultConfigured(settingsApi.settings);
  const configuredDaysCount = getConfiguredDaysCount(
    settingsApi.settings.timetable,
  );

  const vaultController = useSettingsScreenVault({
    settings: settingsApi.settings,
    save: settingsApi.save,
    updateVault: settingsApi.updateVault,
    setSubjects: settingsApi.setSubjects,
    updateTimetable: settingsApi.updateTimetable,
    isVaultConfigured: vaultConfigured,
    addToast,
  });

  const handleOpenSubjectModal = (): void => {
    setEditingSubject(null);
    setIsSubjectModalOpen(true);
  };

  const handleOpenSubjectEditor = (id: string): void => {
    const subject = settingsApi.settings.subjects.find(
      (entry) => entry.id === id,
    );
    if (!subject) {
      return;
    }
    setEditingSubject(subject);
    setIsSubjectModalOpen(true);
  };

  const handleCloseSubjectModal = (): void => {
    setIsSubjectModalOpen(false);
    setEditingSubject(null);
  };

  const handleDeleteSubject = (id: string): void => {
    const subject = settingsApi.settings.subjects.find(
      (entry) => entry.id === id,
    );
    settingsApi.removeSubject(id);
    if (subject) {
      addToast(`Deleted "${subject.name}"`, 'info');
    }
  };

  const handleAddSubject = (name: string): void => {
    settingsApi.addSubject(name);
    addToast(`Added "${name}"`, 'success');
  };

  const handleEditSubject = (id: string, name: string): void => {
    settingsApi.updateSubject(id, name);
    addToast('Updated subject', 'success');
    setEditingSubject(null);
  };

  return {
    settings: settingsApi.settings,
    isLoading: settingsApi.isLoading,
    isSubjectModalOpen,
    editingSubject,
    isVaultConfigured: vaultConfigured,
    configuredDaysCount,
    addTimetableSlot: settingsApi.addTimetableSlot,
    removeTimetableSlot: settingsApi.removeTimetableSlot,
    updateTimetableSlot: settingsApi.updateTimetableSlot,
    ...vaultController,
    handleAIProviderChange: (provider: 'google' | 'ollama'): void =>
      settingsApi.updateAI({ provider }),
    handleGoogleApiKeyChange: (googleApiKey: string): void =>
      settingsApi.updateAI({ googleApiKey }),
    handleOllamaEndpointChange: (ollamaEndpoint: string): void =>
      settingsApi.updateAI({ ollamaEndpoint }),
    handleOpenSubjectModal,
    handleOpenSubjectEditor,
    handleCloseSubjectModal,
    handleDeleteSubject,
    handleAddSubject,
    handleEditSubject,
  };
};
