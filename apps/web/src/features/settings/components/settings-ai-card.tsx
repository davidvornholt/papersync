'use client';

import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import type { Settings } from '@/shared/hooks/use-settings-schema';
import {
  InputField,
  ToggleButtons,
  type ToggleOption,
} from './settings-controls';

type SettingsAICardProps = {
  readonly isManagedAI: boolean;
  readonly settings: Settings;
  readonly options: ReadonlyArray<ToggleOption>;
  readonly onChangeProvider: (provider: 'google' | 'ollama') => void;
  readonly onChangeGoogleApiKey: (apiKey: string) => void;
  readonly onChangeOllamaEndpoint: (endpoint: string) => void;
};

export const SettingsAICard = ({
  isManagedAI,
  settings,
  options,
  onChangeProvider,
  onChangeGoogleApiKey,
  onChangeOllamaEndpoint,
}: SettingsAICardProps): React.ReactElement => {
  const instanceId = useId();
  if (isManagedAI) {
    return (
      <Card>
        <CardHeader>
          <h3 className="serif text-[20px] text-ink">Gemini 3.8 Flash</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>High reasoning through Google Cloud Enterprise AI.</p>
          <p className="text-graphite">
            This server manages the AI connection. Your scan is sent to Google
            Cloud when you process it. Review the recognized homework before
            approving it.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <h2 className="serif text-[20px] text-ink tracking-[-0.022em]">
          AI provider
        </h2>
      </CardHeader>
      <CardContent className="space-y-5">
        <ToggleButtons
          options={options}
          value={settings.ai.provider}
          onChange={(value) => onChangeProvider(value as 'google' | 'ollama')}
        />

        <AnimatePresence mode="wait">
          {settings.ai.provider === 'google' ? (
            <motion.div key="google" initial={false} animate={{ opacity: 1 }}>
              <InputField
                id={`${instanceId}-api-key`}
                label="API key"
                type="password"
                value={settings.ai.googleApiKey ?? ''}
                onChange={onChangeGoogleApiKey}
                placeholder="Enter your Gemini API key"
              />
            </motion.div>
          ) : (
            <motion.div key="ollama" initial={false} animate={{ opacity: 1 }}>
              <InputField
                id={`${instanceId}-ollama-endpoint`}
                label="Ollama endpoint"
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
};
