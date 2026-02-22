import { Context, Data, type Effect } from 'effect';
import type { OCRResponse, WeekId } from '@/shared/types';

export class VisionError extends Data.TaggedError('VisionError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class VisionValidationError extends Data.TaggedError(
  'VisionValidationError',
)<{
  readonly message: string;
  readonly raw?: string;
}> {}

export type OCRResultWithModel = {
  readonly data: OCRResponse;
  readonly modelUsed: string;
};

export type VisionProvider = {
  readonly extractHandwriting: (
    imageBase64: string,
    weekId: WeekId,
    existingContent: string,
  ) => Effect.Effect<OCRResultWithModel, VisionError | VisionValidationError>;
};

export const VisionProvider =
  Context.GenericTag<VisionProvider>('VisionProvider');

export type GeminiModelConfig = {
  readonly modelId: string;
  readonly isGemini3: boolean;
};

export const GEMINI_MODELS: readonly GeminiModelConfig[] = [
  { modelId: 'gemini-3-flash-preview', isGemini3: true },
  { modelId: 'gemini-flash-latest', isGemini3: false },
  { modelId: 'gemini-2.5-flash', isGemini3: false },
  { modelId: 'gemini-flash-lite-latest', isGemini3: false },
  { modelId: 'gemini-2.5-flash-lite', isGemini3: false },
] as const;
