'use client';

import { EditorialHeader } from '@papersync/ui/editorial-header';
import { motion } from 'motion/react';
import { PageTransition } from '@/shared/components/motion-layout';
import { Spinner } from '@/shared/components/motion-loading';
import { AddSubjectModal } from '../components/add-subject-modal';
import { GitHubOAuthModal } from '../components/github-oauth-modal';
import { RepositorySelectorModal } from '../components/repository-selector-modal';
import { SettingsAICard } from '../components/settings-ai-card';
import { SettingsSaveAction } from '../components/settings-save-action';
import { aiOptions, vaultOptions } from '../components/settings-screen-options';
import { SettingsSubjectsCard } from '../components/settings-subjects-card';
import { SettingsVaultCard } from '../components/settings-vault-card';
import { useSettingsScreenController } from './hooks/use-settings-screen-controller';

const easeOut = 'easeOut' as const;

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
        <div className="shell page-shell flex min-h-[60vh] items-center justify-center">
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
                    <p className="serif-italic mt-0.5 text-[13px] text-graphite">
                      {section.italic}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          }
        />

        <div className="mx-auto mt-8 max-w-3xl space-y-12 sm:mt-10 sm:space-y-16 md:mt-14">
          <motion.section
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: easeOut }}
          >
            <p className="section-number">01 — Vault</p>
            <h2 className="mt-3 mb-5 text-[24px] sm:mb-6 sm:text-[28px]">
              Where the notes <span className="serif-italic">come to rest</span>
              .
            </h2>
            <SettingsVaultCard
              settings={controller.settings}
              options={vaultOptions}
              isConfigured={controller.isOAuthConfigured}
              isLoadingVaultSettings={controller.isLoadingVaultSettings}
              superProductivity={controller.superProductivity}
              onChangeMethod={controller.handleVaultMethodChange}
              onChangeLocalPath={controller.handleVaultPathChange}
              onConnect={controller.handleConnect}
              onDisconnect={controller.handleDisconnect}
              onOpenRepoSelector={controller.handleOpenRepoSelector}
            />
          </motion.section>

          <motion.section
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: easeOut }}
          >
            <p className="section-number">02 — Vision</p>
            <h2 className="mt-3 mb-5 text-[24px] sm:mb-6 sm:text-[28px]">
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
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: easeOut }}
          >
            <p className="section-number">03 — Timetable</p>
            <h2 className="mt-3 mb-5 text-[24px] sm:mb-6 sm:text-[28px]">
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
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: easeOut }}
            className="border-hairline border-t pt-8"
          >
            <SettingsSaveAction
              isSaving={controller.isSaving}
              isSyncing={controller.isSyncing}
              isVaultConfigured={controller.isVaultConfigured}
              onSave={() => controller.handleSave()}
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
