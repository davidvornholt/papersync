import { Effect, Layer } from 'effect';
import { VisionConfigurationError } from '../errors/vision-contract';
import { hasBedrockConfiguration } from './vision-bedrock-config';
import { getBedrockVisionProvider } from './vision-bedrock-provider';
import { VisionProvider } from './vision-contract';
import {
  makeGoogleVisionLayer,
  makeOllamaVisionLayer,
} from './vision-provider';

/** Browser-local AI preferences; ignored when the server manages AWS Bedrock. */
export type VisionSettings = {
  readonly provider: 'google' | 'ollama';
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
};

export const getVisionLayer = (settings: VisionSettings) =>
  Effect.gen(function* () {
    if (hasBedrockConfiguration()) {
      const provider = yield* getBedrockVisionProvider();
      return Layer.succeed(VisionProvider, provider);
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
          'AI is not configured. Configure AWS Bedrock on the server or add a provider in Settings.',
      }),
    );
  });
