'use client';

import { useState } from 'react';
import { useSettings } from '@/shared/hooks/use-settings';
import type { Subject } from '@/shared/settings/schema';
import { getConfiguredDaysCount } from '../settings-screen-helpers';
export const useSettingsScreenController = () => {
  const settingsApi = useSettings();
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const configuredDaysCount = getConfiguredDaysCount(
    settingsApi.settings.timetable,
  );

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

  const handleEditSubject = (id: string, name: string): void => {
    settingsApi.updateSubject(id, name);
    setEditingSubject(null);
  };

  return {
    settings: settingsApi.settings,
    isLoading: settingsApi.isLoading,
    loadError: settingsApi.loadError,
    saveStatus: settingsApi.saveStatus,
    retrySave: settingsApi.retrySave,
    isSubjectModalOpen,
    editingSubject,
    configuredDaysCount,
    addSubjectToDay: settingsApi.addSubjectToDay,
    removeSubjectFromDay: settingsApi.removeSubjectFromDay,
    handleAIProviderChange: (provider: 'google' | 'ollama'): void =>
      settingsApi.updateAI({ provider }),
    handleGoogleApiKeyChange: (googleApiKey: string): void =>
      settingsApi.updateAI({ googleApiKey }),
    handleOllamaEndpointChange: (ollamaEndpoint: string): void =>
      settingsApi.updateAI({ ollamaEndpoint }),
    handleOpenSubjectModal,
    handleOpenSubjectEditor,
    handleCloseSubjectModal,
    handleDeleteSubject: settingsApi.removeSubject,
    handleAddSubject: settingsApi.addSubject,
    handleEditSubject,
  };
};
