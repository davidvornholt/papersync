'use client';

import { motion } from 'motion/react';
import {
  PageTransition,
  Spinner,
  StaggerContainer,
  StaggerItem,
} from '@/shared/components';
import { AddSubjectModal } from '../components/add-subject-modal';
import { GitHubOAuthModal } from '../components/github-oauth-modal';
import { RepositorySelectorModal } from '../components/repository-selector-modal';
import { SettingsAICard } from '../components/settings-ai-card';
import { SettingsSaveAction } from '../components/settings-save-action';
import { aiOptions, vaultOptions } from '../components/settings-screen-options';
import { SettingsSubjectsCard } from '../components/settings-subjects-card';
import { SettingsVaultCard } from '../components/settings-vault-card';
import { useSettingsScreenController } from './hooks/use-settings-screen-controller';

export const SettingsScreen = (): React.ReactElement => {
  const controller = useSettingsScreenController();

  if (controller.isLoading) {
    return (
      <PageTransition>
        <div className="page-container flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="page-container">
        <header className="page-header">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-foreground"
            >
              Settings
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted mt-1"
            >
              Configure PaperSync preferences
            </motion.p>
          </div>
        </header>

        <StaggerContainer className="max-w-3xl space-y-8">
          <StaggerItem>
            <SettingsVaultCard
              settings={controller.settings}
              options={vaultOptions}
              isConfigured={controller.isOAuthConfigured}
              isLoadingVaultSettings={controller.isLoadingVaultSettings}
              onChangeMethod={controller.handleVaultMethodChange}
              onChangeLocalPath={controller.handleVaultPathChange}
              onConnect={controller.handleConnect}
              onDisconnect={controller.handleDisconnect}
              onOpenRepoSelector={controller.handleOpenRepoSelector}
            />
          </StaggerItem>

          <StaggerItem>
            <SettingsAICard
              settings={controller.settings}
              options={aiOptions}
              onChangeProvider={controller.handleAIProviderChange}
              onChangeGoogleApiKey={controller.handleGoogleApiKeyChange}
              onChangeOllamaEndpoint={controller.handleOllamaEndpointChange}
            />
          </StaggerItem>

          <StaggerItem>
            <SettingsSubjectsCard
              settings={controller.settings}
              isVaultConfigured={controller.isVaultConfigured}
              configuredDaysCount={controller.configuredDaysCount}
              onOpenSubjectModal={controller.handleOpenSubjectModal}
              onEditSubject={controller.handleOpenSubjectEditor}
              onDeleteSubject={controller.handleDeleteSubject}
              onAddTimetableSlot={controller.addTimetableSlot}
              onRemoveTimetableSlot={controller.removeTimetableSlot}
              onUpdateTimetableSlot={controller.updateTimetableSlot}
            />
          </StaggerItem>

          <StaggerItem>
            <SettingsSaveAction
              isSaving={controller.isSaving}
              isSyncing={controller.isSyncing}
              isVaultConfigured={controller.isVaultConfigured}
              onSave={() => void controller.handleSave()}
            />
          </StaggerItem>
        </StaggerContainer>
      </div>

      <AddSubjectModal
        isOpen={controller.isSubjectModalOpen}
        onClose={controller.handleCloseSubjectModal}
        onAdd={controller.handleAddSubject}
        editingSubject={controller.editingSubject}
        onEdit={controller.handleEditSubject}
        existingSubjects={controller.settings.subjects}
      />

      <GitHubOAuthModal
        isOpen={controller.isOAuthModalOpen}
        onClose={controller.handleOAuthModalClose}
        onSuccess={controller.handleOAuthSuccess}
        oauthState={controller.oauthState}
        onStartOAuth={controller.startOAuth}
        onCancel={controller.cancelOAuth}
      />

      <RepositorySelectorModal
        isOpen={controller.isRepoSelectorOpen}
        onClose={controller.handleCloseRepoSelector}
        onSelect={controller.handleRepoSelect}
        accessToken={controller.settings.vault.githubToken || ''}
      />
    </PageTransition>
  );
};
