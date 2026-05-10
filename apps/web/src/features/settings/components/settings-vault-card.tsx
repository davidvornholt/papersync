'use client';

import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { AnimatePresence, motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion';
import type { Settings, VaultMethod } from '@/shared/hooks/use-settings';
import {
  InputField,
  ToggleButtons,
  type ToggleOption,
} from './settings-controls';
import {
  SettingsVaultSuperProductivityPanel,
  type SuperProductivityConnectionStatus,
} from './settings-vault-super-productivity-panel';

export type SuperProductivityVaultProps = {
  readonly tagIdsInput: string;
  readonly status: SuperProductivityConnectionStatus;
  readonly error: string | null;
  readonly onChangeEndpoint: (endpoint: string) => void;
  readonly onChangeProjectId: (projectId: string) => void;
  readonly onChangeTagIds: (tagIds: string) => void;
  readonly onTestConnection: () => void;
};

type SettingsVaultCardProps = {
  readonly settings: Settings;
  readonly options: readonly ToggleOption[];
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
}: SettingsVaultCardProps): React.ReactElement => (
  <Card>
    <CardHeader>
      <h2 className="serif text-[20px] tracking-[-0.022em] text-ink">
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
          <motion.div
            key="local"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <InputField
              id="vault-path"
              label="Vault path"
              value={settings.vault.localPath ?? ''}
              onChange={onChangeLocalPath}
              placeholder="/path/to/your/vault"
            />
            {isLoadingVaultSettings && (
              <div className="flex items-center gap-2 text-[13px] text-graphite mt-2">
                <Spinner size="sm" />
                <span>Loading settings from vault…</span>
              </div>
            )}
          </motion.div>
        ) : settings.vault.method === 'github' ? (
          <motion.div
            key="github"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {settings.vault.githubConnected ? (
              <div className="relative px-4 py-4 bg-paper-deep border border-hairline">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[2px] bg-accent"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="serif text-[16px] tracking-[-0.018em] text-ink">
                      Connected to GitHub
                    </p>
                    <p className="text-[13px] text-graphite mt-0.5">
                      @{settings.vault.githubUsername || 'unknown'}
                    </p>
                    {settings.vault.githubRepo && (
                      <p className="mono text-[12px] text-accent mt-1 truncate">
                        {settings.vault.githubRepo}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SettingsVaultSuperProductivityPanel
              endpoint={settings.vault.superProductivityEndpoint ?? ''}
              projectId={settings.vault.superProductivityProjectId ?? ''}
              tagIdsInput={superProductivity.tagIdsInput}
              status={superProductivity.status}
              errorMessage={superProductivity.error}
              onChangeEndpoint={superProductivity.onChangeEndpoint}
              onChangeProjectId={superProductivity.onChangeProjectId}
              onChangeTagIds={superProductivity.onChangeTagIds}
              onTestConnection={superProductivity.onTestConnection}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </CardContent>
  </Card>
);
