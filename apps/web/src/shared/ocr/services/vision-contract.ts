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

export const scanImageTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type ScanImageType = (typeof scanImageTypes)[number];

/** One photographed or scanned page of the same planner sheet. */
export type ScanImage = {
  readonly data: Uint8Array;
  readonly mediaType: ScanImageType;
};

export type VisionProvider = {
  readonly extractHandwriting: (
    images: ReadonlyArray<ScanImage>,
    weekId: WeekId | null,
  ) => Effect.Effect<OCRResultWithModel, VisionError | VisionValidationError>;
};

export const VisionProvider =
  Context.GenericTag<VisionProvider>('VisionProvider');

export const GEMINI_MODEL = 'gemini-3.8-flash';
export const CLAUDE_MODEL = 'global.anthropic.claude-sonnet-5-5';
