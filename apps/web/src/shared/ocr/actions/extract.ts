'use server';

import { databaseRuntime } from '@papersync/db/runtime';
import { Effect } from 'effect';
import { requireSession } from '@/shared/auth/session';
import { reconcileHomework } from '@/shared/homework/reconcile';
import { VisionProvider } from '@/shared/ocr/services/vision-contract';
import { getVisionLayer } from '@/shared/ocr/services/vision-selection';
import type { ExtractionOptions, ExtractionResult } from './extract-types';

/**
 * Server Actions for OCR Extraction
 *
 * Note: Types and error classes are in extract-types.ts because
 * "use server" files can only export async functions.
 */

const extractHandwritingEffect = (options: ExtractionOptions) =>
  Effect.gen(function* () {
    const { imageBase64, weekId } = options;
    const visionLayer = yield* getVisionLayer(options);

    // Run the extraction with the vision provider
    const vision = yield* Effect.provide(VisionProvider, visionLayer);
    const result = yield* Effect.provide(
      vision.extractHandwriting(imageBase64, weekId),
      visionLayer,
    );

    const data = yield* reconcileHomework(result.data);
    yield* Effect.logInfo('Scan analysis completed').pipe(
      Effect.annotateLogs({
        model: result.modelUsed,
        weekResolved: data.weekId !== null,
        weekHintProvided: weekId !== null,
        entryCount: data.entries.length,
        alreadySavedCount: data.entries.filter(
          (entry) => entry.action === 'skip',
        ).length,
      }),
    );
    return { data, modelUsed: result.modelUsed };
  });

export const extractHandwriting = async (
  options: ExtractionOptions,
): Promise<ExtractionResult> => {
  await requireSession();
  return databaseRuntime.runPromise(
    extractHandwritingEffect(options).pipe(
      Effect.map((result) => ({
        success: true as const,
        data: result.data,
        modelUsed: result.modelUsed,
      })),
      Effect.tapError((error) =>
        Effect.logWarning('Scan analysis failed').pipe(
          Effect.annotateLogs('errorType', error._tag),
        ),
      ),
      Effect.catchAll((error) =>
        Effect.succeed({ success: false as const, error: error.message }),
      ),
    ),
  );
};
