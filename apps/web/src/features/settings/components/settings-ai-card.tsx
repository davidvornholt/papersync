'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Card, CardContent, CardHeader } from '@/shared/components';
import type { Settings } from '@/shared/hooks/use-settings';
import {
  InputField,
  ToggleButtons,
  type ToggleOption,
} from './settings-controls';

type SettingsAICardProps = {
  readonly settings: Settings;
  readonly options: readonly ToggleOption[];
  readonly onChangeProvider: (provider: 'google' | 'ollama') => void;
  readonly onChangeGoogleApiKey: (apiKey: string) => void;
  readonly onChangeOllamaEndpoint: (endpoint: string) => void;
};

export const SettingsAICard = ({
  settings,
  options,
  onChangeProvider,
  onChangeGoogleApiKey,
  onChangeOllamaEndpoint,
}: SettingsAICardProps): React.ReactElement => (
  <Card>
    <CardHeader>
      <h2 className="text-lg font-semibold font-display">AI Provider</h2>
    </CardHeader>
    <CardContent className="space-y-4">
      <ToggleButtons
        options={options}
        value={settings.ai.provider}
        onChange={(value) => onChangeProvider(value as 'google' | 'ollama')}
      />

      <AnimatePresence mode="wait">
        {settings.ai.provider === 'google' ? (
          <motion.div
            key="google"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <InputField
              id="api-key"
              label="API Key"
              type="password"
              value={settings.ai.googleApiKey ?? ''}
              onChange={onChangeGoogleApiKey}
              placeholder="Enter your Gemini API key"
            />
          </motion.div>
        ) : (
          <motion.div
            key="ollama"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <InputField
              id="ollama-endpoint"
              label="Ollama Endpoint"
              value={settings.ai.ollamaEndpoint ?? ''}
              onChange={onChangeOllamaEndpoint}
              placeholder="http://localhost:11434"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </CardContent>
  </Card>
);
