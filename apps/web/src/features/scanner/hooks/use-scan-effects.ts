import { Effect } from 'effect';
import {
  ExtractionRequestError,
  FileReadError,
} from '@/features/scanner/errors/use-scan-effects';
import { extractHandwriting } from '@/shared/ocr/actions/extract';
import type { VaultSettings } from '@/shared/ocr/actions/extract-types';
import type { WeekId } from '@/shared/types/schemas';
import type { AISettings, ExtractedEntry, ScanState } from './use-scan-types';

const percentageScale = 100;
const bytesPerMebibyte = 1_048_576;
const maximumImageBytes = 10 * bytesPerMebibyte;
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const readFileAsDataUrl = (
  file: File,
  onProgress: (progress: number) => void,
): Effect.Effect<string, FileReadError> =>
  Effect.async<string, FileReadError>((resume) => {
    if (file.size > maximumImageBytes || !supportedImageTypes.has(file.type)) {
      resume(
        Effect.fail(
          new FileReadError({
            message: 'Choose a JPEG, PNG, or WebP image no larger than 10 MB.',
          }),
        ),
      );
      return;
    }
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * percentageScale));
      }
    };

    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resume(Effect.succeed(result));
        return;
      }
      resume(
        Effect.fail(
          new FileReadError({ message: 'Failed to read file as data URL' }),
        ),
      );
    };

    reader.onerror = () => {
      resume(
        Effect.fail(new FileReadError({ message: 'Failed to read file' })),
      );
    };

    reader.readAsDataURL(file);
    return Effect.sync(() => {
      reader.onload = null;
      reader.onerror = null;
      reader.onprogress = null;
      reader.abort();
    });
  });

export const processExtractionEffect = (
  imageData: string,
  weekId: WeekId,
  aiSettings: AISettings,
  vaultSettings?: VaultSettings,
): Effect.Effect<ScanState, never> =>
  Effect.tryPromise({
    try: () =>
      extractHandwriting({
        imageBase64: imageData,
        weekId,
        provider: aiSettings.provider,
        googleApiKey: aiSettings.googleApiKey,
        ollamaEndpoint: aiSettings.ollamaEndpoint,
        vaultSettings,
      }),
    catch: (error) =>
      new ExtractionRequestError({
        message: 'Unknown error during extraction',
        cause: error,
      }),
  }).pipe(
    Effect.flatMap((result): Effect.Effect<ScanState, never> => {
      if (!result.success) {
        return Effect.succeed({
          status: 'error' as const,
          error: result.error,
        });
      }

      const entries: Array<ExtractedEntry> = result.data.entries.map(
        (entry, index) => ({
          id: `entry-${Date.now()}-${index}`,
          day: entry.day,
          subject: entry.subject,
          content: entry.content,
          isTask: entry.isTask,
          isCompleted: entry.isCompleted,
          isNew: entry.action === 'add',
          dueDate: entry.dueDate,
        }),
      );

      return Effect.succeed({
        status: 'complete' as const,
        entries,
        confidence: result.data.confidence,
        modelUsed: result.modelUsed,
      });
    }),
    Effect.catchAll((error) =>
      Effect.succeed<ScanState>({
        status: 'error' as const,
        error: error.message,
      }),
    ),
  );
