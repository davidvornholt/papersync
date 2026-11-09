import { Effect, Layer, Option } from 'effect';
import { VisionConfigurationError } from '../errors/vision-contract';
import { getClaudeApiKey } from './vision-claude-config';
import { createClaudeVisionProvider } from './vision-claude-provider';
import { VisionProvider } from './vision-contract';
import {
  makeGoogleVisionLayer,
  makeOllamaVisionLayer,
} from './vision-provider';

/** Browser-local AI preferences; ignored when the server has a Claude API key. */
export type VisionSettings = {
  readonly provider: 'google' | 'ollama';
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
};

export const getVisionLayer = (settings: VisionSettings) =>
  Effect.gen(function* () {
    const claudeApiKey = getClaudeApiKey();
    if (Option.isSome(claudeApiKey)) {
      return Layer.succeed(
        VisionProvider,
        createClaudeVisionProvider(claudeApiKey.value),
      );
    }
    if (settings.provider === 'google' && settings.googleApiKey) {
      return makeGoogleVisionLayer(settings.googleApiKey);
    }
    if (settings.provider === 'ollama' && settings.ollamaEndpoint) {
      return makeOllamaVisionLayer(settings.ollamaEndpoint);
    }
    return yield* Effect.fail(
      new VisionConfigurationError({
        message:
          'AI is not configured. Configure the Claude API on the server or add a provider in Settings.',
      }),
    );
  });
