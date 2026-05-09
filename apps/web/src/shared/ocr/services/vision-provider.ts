import { Layer } from 'effect';
import type { VisionProvider } from './vision-contract';
import { VisionProvider as VisionProviderTag } from './vision-contract';
import { createGoogleVisionProvider } from './vision-google-provider';
import { createOllamaVisionProvider } from './vision-ollama-provider';

export type { GeminiModelConfig, OCRResultWithModel } from './vision-contract';
export {
  GEMINI_MODELS,
  VisionError,
  VisionProvider,
  VisionValidationError,
} from './vision-contract';
export {
  createExtractionSystemPrompt,
  normalizeDayName,
} from './vision-prompt';
export { OCRResponseJsonSchema, OCRResponseSchema } from './vision-schema';

export const makeGoogleVisionLayer = (
  apiKey: string,
): Layer.Layer<VisionProvider, never, never> =>
  Layer.succeed(VisionProviderTag, createGoogleVisionProvider(apiKey));

export const makeOllamaVisionLayer = (
  endpoint = 'http://localhost:11434',
): Layer.Layer<VisionProvider, never, never> =>
  Layer.succeed(VisionProviderTag, createOllamaVisionProvider(endpoint));
