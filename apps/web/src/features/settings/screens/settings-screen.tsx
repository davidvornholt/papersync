'use client';

import { EditorialHeader } from '@papersync/ui/editorial-header';
import { motion } from 'motion/react';
import { PageTransition, Spinner } from '@/shared/components/motion';
import { AddSubjectModal } from '../components/add-subject-modal';
import { GitHubOAuthModal } from '../components/github-oauth-modal';
import { RepositorySelectorModal } from '../components/repository-selector-modal';
import { SettingsAICard } from '../components/settings-ai-card';
import { SettingsSaveAction } from '../components/settings-save-action';
import { aiOptions, vaultOptions } from '../components/settings-screen-options';
import { SettingsSubjectsCard } from '../components/settings-subjects-card';
import { SettingsVaultCard } from '../components/settings-vault-card';
import { useSettingsScreenController } from './hooks/use-settings-screen-controller';

const easeOut = [0.2, 0.6, 0.2, 1] as const;

const SECTIONS = [
  {
    number: '01',
    title: 'Vault',
    italic: 'where everything lives',
  },
  {
    number: '02',
    title: 'Vision',
    italic: 'the model that reads',
  },
  {
    number: '03',
    title: 'Timetable',
    italic: 'subjects and slots',
  },
] as const;

export const SettingsScreen = (): React.ReactElement => {
  const controller = useSettingsScreenController();

  if (controller.isLoading) {
    return (
      <PageTransition>
        <div className="shell page-shell flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="shell page-shell">
        <EditorialHeader
          index="Section iv"
          section="Settings"
          title="Tune the press"
          italicSuffix="to your hand."
          description="Three quiet decisions: where your notes live, which model reads your handwriting, and what your week looks like. Set once, edit rarely. Your keys, your vault, your defaults — never sent anywhere unless you ask."
          aside={
            <div className="space-y-5">
              {SECTIONS.map((section) => (
                <div
                  key={section.number}
                  className="grid grid-cols-[36px_1fr] items-baseline gap-3"
                >
                  <span className="mono text-[12px] text-graphite">
                    {section.number}
                  </span>
                  <div>
                    <p className="serif text-[18px] text-ink leading-tight">
                      {section.title}
                    </p>
                    <p className="serif-italic text-[13px] text-graphite mt-0.5">
                      {section.italic}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          }
        />

        <div className="mt-8 sm:mt-10 md:mt-14 max-w-3xl mx-auto space-y-12 sm:space-y-16">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: easeOut }}
          >
            <p className="section-number">01 — Vault</p>
            <h2 className="mt-3 mb-5 sm:mb-6 text-[24px] sm:text-[28px]">
              Where the notes <span className="serif-italic">come to rest</span>
              .
            </h2>
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
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: easeOut }}
          >
            <p className="section-number">02 — Vision</p>
            <h2 className="mt-3 mb-5 sm:mb-6 text-[24px] sm:text-[28px]">
              The model that{' '}
              <span className="serif-italic ink">reads your hand</span>.
            </h2>
            <SettingsAICard
              settings={controller.settings}
              options={aiOptions}
              onChangeProvider={controller.handleAIProviderChange}
              onChangeGoogleApiKey={controller.handleGoogleApiKeyChange}
              onChangeOllamaEndpoint={controller.handleOllamaEndpointChange}
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: easeOut }}
          >
            <p className="section-number">03 — Timetable</p>
            <h2 className="mt-3 mb-5 sm:mb-6 text-[24px] sm:text-[28px]">
              Subjects, slots, and{' '}
              <span className="serif-italic">the shape of a week</span>.
            </h2>
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
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: easeOut }}
            className="pt-8 border-t border-hairline"
          >
            <SettingsSaveAction
              isSaving={controller.isSaving}
              isSyncing={controller.isSyncing}
              isVaultConfigured={controller.isVaultConfigured}
              onSave={() => void controller.handleSave()}
            />
          </motion.div>
        </div>
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
