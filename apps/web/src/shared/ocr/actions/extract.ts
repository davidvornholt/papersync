'use server';

import { Effect } from 'effect';
import { requireSession } from '@/shared/auth/session';
import type {
  VisionError,
  VisionValidationError,
} from '@/shared/ocr/errors/vision-contract';
import { VisionProvider } from '@/shared/ocr/services/vision-contract';
import { getVisionLayer } from '@/shared/ocr/services/vision-selection';
import type { OCRResponse } from '@/shared/types/schemas';
import type {
  ExtractionOptions,
  ExtractionResult,
  ExtractionValidationError,
} from './extract-types';

/**
 * Server Actions for OCR Extraction
 *
 * Note: Types and error classes are in extract-types.ts because
 * "use server" files can only export async functions.
 */

const extractHandwritingEffect = (
  options: ExtractionOptions,
): Effect.Effect<
  { readonly data: OCRResponse; readonly modelUsed: string },
  ExtractionValidationError | VisionError | VisionValidationError
> =>
  Effect.gen(function* () {
    const { imageBase64, weekId } = options;
    const visionLayer = yield* getVisionLayer(options);

    // Run the extraction with the vision provider
    const vision = yield* Effect.provide(VisionProvider, visionLayer);
    const result = yield* Effect.provide(
      vision.extractHandwriting(imageBase64, weekId),
      visionLayer,
    );

    return { data: result.data, modelUsed: result.modelUsed };
  });

export const extractHandwriting = async (
  options: ExtractionOptions,
): Promise<ExtractionResult> => {
  await requireSession();
  return Effect.runPromise(
    extractHandwritingEffect(options).pipe(
      Effect.map((result) => ({
        success: true as const,
        data: result.data,
        modelUsed: result.modelUsed,
      })),
      Effect.catchAll((error) =>
        Effect.succeed({ success: false as const, error: error.message }),
      ),
    ),
  );
};
