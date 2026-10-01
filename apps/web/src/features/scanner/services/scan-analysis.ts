import { Effect } from 'effect';
import { reconcileHomework } from '@/shared/homework/reconcile';
import {
  type ScanImage,
  VisionProvider,
} from '@/shared/ocr/services/vision-contract';
import {
  getVisionLayer,
  type VisionSettings,
} from '@/shared/ocr/services/vision-selection';
import type { OCRResponse, WeekId } from '@/shared/types/schemas';

export type ScanAnalysisInput = {
  readonly pages: ReadonlyArray<ScanImage>;
  readonly weekId: WeekId | null;
  readonly vision: VisionSettings;
};

export type ScanAnalysis = {
  readonly data: OCRResponse;
  readonly modelUsed: string;
};

export const analyzeScan = (input: ScanAnalysisInput) =>
  Effect.gen(function* () {
    const visionLayer = yield* getVisionLayer(input.vision);
    const vision = yield* Effect.provide(VisionProvider, visionLayer);
    const result = yield* vision.extractHandwriting(input.pages, input.weekId);
    const data = yield* reconcileHomework(result.data);
    yield* Effect.logInfo('Scan analysis completed').pipe(
      Effect.annotateLogs({
        model: result.modelUsed,
        pageCount: input.pages.length,
        weekResolved: data.weekId !== null,
        weekHintProvided: input.weekId !== null,
        entryCount: data.entries.length,
        alreadySavedCount: data.entries.filter(
          (entry) => entry.action === 'skip',
        ).length,
      }),
    );
    return { data, modelUsed: result.modelUsed } satisfies ScanAnalysis;
  });
