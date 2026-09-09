'use client';

import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import { Spinner } from '@/shared/components/motion-loading';
import type { Settings, VaultMethod } from '@/shared/hooks/use-settings-schema';
import {
  InputField,
  ToggleButtons,
  type ToggleOption,
} from './settings-controls';
import { SettingsVaultSuperProductivityPanel } from './settings-vault-super-productivity-panel';
export type SuperProductivityVaultProps = {
  readonly tagIdsInput: string;
  readonly onChangeProjectId: (projectId: string) => void;
  readonly onChangeTagIds: (tagIds: string) => void;
};

type SettingsVaultCardProps = {
  readonly settings: Settings;
  readonly options: ReadonlyArray<ToggleOption>;
  readonly isConfigured: boolean;
  readonly isLoadingVaultSettings: boolean;
  readonly superProductivity: SuperProductivityVaultProps;
  readonly onChangeMethod: (method: VaultMethod) => void;
  readonly onChangeLocalPath: (path: string) => void;
  readonly onConnect: () => void;
  readonly onDisconnect: () => void;
  readonly onOpenRepoSelector: () => void;
};

export const SettingsVaultCard = ({
  settings,
  options,
  isConfigured,
  isLoadingVaultSettings,
  superProductivity,
  onChangeMethod,
  onChangeLocalPath,
  onConnect,
  onDisconnect,
  onOpenRepoSelector,
}: SettingsVaultCardProps): React.ReactElement => {
  const instanceId = useId();
  return (
    <Card>
      <CardHeader>
        <h2 className="serif text-[20px] text-ink tracking-[-0.022em]">
          Sync destination
        </h2>
      </CardHeader>
      <CardContent className="space-y-5">
        <ToggleButtons
          options={options}
          value={settings.vault.method}
          onChange={(value) => onChangeMethod(value as VaultMethod)}
        />

        <AnimatePresence mode="wait">
          {settings.vault.method === 'local' ? (
            <motion.div key="local" initial={false} animate={{ opacity: 1 }}>
              <InputField
                id={`${instanceId}-vault-path`}
                label="Vault path"
                value={settings.vault.localPath ?? ''}
                onChange={onChangeLocalPath}
                placeholder="/path/to/your/vault"
              />
              {isLoadingVaultSettings ? (
                <div className="mt-2 flex items-center gap-2 text-[13px] text-graphite">
                  <Spinner size="sm" />
                  <span>Loading settings from vault…</span>
                </div>
              ) : null}
            </motion.div>
          ) : null}
          {settings.vault.method === 'github' ? (
            <motion.div
              key="github"
              initial={false}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {settings.vault.githubConnected ? (
                <div className="relative border border-hairline bg-paper-deep p-4">
                  <span
                    aria-hidden={true}
                    className="absolute inset-y-0 left-0 w-[2px] bg-accent"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="serif text-[16px] text-ink tracking-[-0.018em]">
                        Connected to GitHub
                      </p>
                      <p className="mt-0.5 text-[13px] text-graphite">
                        @{settings.vault.githubUsername || 'unknown'}
                      </p>
                      {settings.vault.githubRepo ? (
                        <p className="mono mt-1 truncate text-[12px] text-accent">
                          {settings.vault.githubRepo}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={onOpenRepoSelector}
                      >
                        {settings.vault.githubRepo
                          ? 'Change repo'
                          : 'Select repo'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={onDisconnect}>
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={onConnect}
                  disabled={!isConfigured}
                  className="w-full"
                >
                  Connect with GitHub
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="super-productivity"
              initial={false}
              animate={{ opacity: 1 }}
            >
              <SettingsVaultSuperProductivityPanel
                projectId={settings.vault.superProductivityProjectId ?? ''}
                tagIdsInput={superProductivity.tagIdsInput}
                onChangeProjectId={superProductivity.onChangeProjectId}
                onChangeTagIds={superProductivity.onChangeTagIds}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
