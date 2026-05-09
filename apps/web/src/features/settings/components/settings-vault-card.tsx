'use client';

import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { AnimatePresence, motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion';
import type { Settings } from '@/shared/hooks/use-settings';
import {
  InputField,
  ToggleButtons,
  type ToggleOption,
} from './settings-controls';

type SettingsVaultCardProps = {
  readonly settings: Settings;
  readonly options: readonly ToggleOption[];
  readonly isConfigured: boolean;
  readonly isLoadingVaultSettings: boolean;
  readonly onChangeMethod: (method: 'local' | 'github') => void;
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
  onChangeMethod,
  onChangeLocalPath,
  onConnect,
  onDisconnect,
  onOpenRepoSelector,
}: SettingsVaultCardProps): React.ReactElement => (
  <Card>
    <CardHeader>
      <h2 className="serif text-[20px] tracking-[-0.022em] text-ink">
        Obsidian vault
      </h2>
    </CardHeader>
    <CardContent className="space-y-5">
      <ToggleButtons
        options={options}
        value={settings.vault.method}
        onChange={(value) => onChangeMethod(value as 'local' | 'github')}
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
        ) : (
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
        )}
      </AnimatePresence>
    </CardContent>
  </Card>
);
