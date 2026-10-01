import { Effect, Layer } from 'effect';
import { VisionConfigurationError } from '../errors/vision-contract';
import { VisionProvider } from './vision-contract';
import {
  makeGoogleVisionLayer,
  makeOllamaVisionLayer,
} from './vision-provider';
import { hasVertexConfiguration } from './vision-vertex-config';
import { getVertexVisionProvider } from './vision-vertex-provider';

/** Browser-local AI preferences; ignored when the server manages Vertex AI. */
export type VisionSettings = {
  readonly provider: 'google' | 'ollama';
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
};

export const getVisionLayer = (settings: VisionSettings) =>
  Effect.gen(function* () {
    if (hasVertexConfiguration()) {
      const provider = yield* getVertexVisionProvider();
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
          'AI is not configured. Configure Google Cloud on the server or add a provider in Settings.',
      }),
    );
  });
