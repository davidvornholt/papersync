import { Effect, Layer } from 'effect';
import {
  type ExtractionOptions,
  ExtractionValidationError,
} from '../actions/extract-types';
import { VisionProvider } from './vision-contract';
import {
  makeGoogleVisionLayer,
  makeOllamaVisionLayer,
} from './vision-provider';
import { hasVertexConfiguration } from './vision-vertex-config';
import { getVertexVisionProvider } from './vision-vertex-provider';

export const getVisionLayer = (options: ExtractionOptions) =>
  Effect.gen(function* () {
    if (hasVertexConfiguration()) {
      const provider = yield* getVertexVisionProvider();
      return Layer.succeed(VisionProvider, provider);
    }
    if (options.provider === 'google' && options.googleApiKey) {
      return makeGoogleVisionLayer(options.googleApiKey);
    }
    if (options.provider === 'ollama' && options.ollamaEndpoint) {
      return makeOllamaVisionLayer(options.ollamaEndpoint);
    }
    return yield* Effect.fail(
      new ExtractionValidationError({
        message:
          'AI is not configured. Configure Google Cloud on the server or add a provider in Settings.',
      }),
    );
  });
