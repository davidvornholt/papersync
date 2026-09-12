'use client';

import { Effect } from 'effect';
import { useState } from 'react';
import { useToast } from '@/shared/components/use-toast';
import { useSettings } from '@/shared/hooks/use-settings';
import type { Subject } from '@/shared/hooks/use-settings-schema';
import { requestAction } from '@/shared/http/action';
import { getConfiguredDaysCount } from '../settings-screen-helpers';
export const useSettingsScreenController = () => {
  const settingsApi = useSettings();
  const { addToast } = useToast();
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const configuredDaysCount = getConfiguredDaysCount(
    settingsApi.settings.timetable,
  );

  const handleSave = () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    Effect.runFork(
      requestAction(settingsApi.save).pipe(
        Effect.tap(() =>
          Effect.sync(() =>
            addToast('Settings saved on this browser.', 'success'),
          ),
        ),
        Effect.catchAll((error) =>
          Effect.sync(() => addToast(error.message, 'error')),
        ),
        Effect.ensuring(Effect.sync(() => setIsSaving(false))),
      ),
    );
  };

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
    configuredDaysCount,
    addTimetableSlot: settingsApi.addTimetableSlot,
    removeTimetableSlot: settingsApi.removeTimetableSlot,
    updateTimetableSlot: settingsApi.updateTimetableSlot,
    isSaving,
    handleSave,
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
