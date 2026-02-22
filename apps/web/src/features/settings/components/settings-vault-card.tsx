'use client';

import { AnimatePresence, motion } from 'motion/react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Spinner,
} from '@/shared/components';
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
      <h2 className="text-lg font-semibold font-display">Obsidian Vault</h2>
    </CardHeader>
    <CardContent className="space-y-4">
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
              label="Vault Path"
              value={settings.vault.localPath ?? ''}
              onChange={onChangeLocalPath}
              placeholder="/path/to/your/vault"
            />
            {isLoadingVaultSettings && (
              <div className="flex items-center gap-2 text-sm text-muted mt-2">
                <Spinner size="sm" />
                <span>Loading settings from vault...</span>
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
              <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border border-accent/20">
                <div>
                  <p className="font-medium text-foreground">
                    Connected to GitHub
                  </p>
                  <p className="text-sm text-muted">
                    @{settings.vault.githubUsername || 'unknown'}
                  </p>
                  {settings.vault.githubRepo && (
                    <p className="text-xs text-accent mt-1">
                      {settings.vault.githubRepo}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onOpenRepoSelector}
                  >
                    {settings.vault.githubRepo ? 'Change Repo' : 'Select Repo'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onDisconnect}>
                    Disconnect
                  </Button>
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
