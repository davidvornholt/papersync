import { Context, type Effect } from 'effect';
import type {
  VisionError,
  VisionValidationError,
} from '@/shared/ocr/errors/vision-contract';
import type { OCRResponse, WeekId } from '@/shared/types/schemas';
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

export const GEMINI_MODEL = 'gemini-3.8-flash';
