import { Effect } from 'effect';
import {
  extractHandwriting,
  type VaultSettings,
} from '@/shared/services/ocr-actions';
import type { WeekId } from '@/shared/types';
import type { AISettings, ExtractedEntry, ScanState } from './use-scan-types';

export const getCurrentWeekId = (): WeekId => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}` as WeekId;
};

export const readFileAsDataUrl = (
  file: File,
  onProgress: (progress: number) => void,
): Effect.Effect<string, Error> =>
  Effect.async<string, Error>((resume) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    reader.onload = (event) => {
      resume(Effect.succeed(event.target?.result as string));
    };

    reader.onerror = () => {
      resume(Effect.fail(new Error('Failed to read file')));
    };

    reader.readAsDataURL(file);
  });

export const processExtractionEffect = (
  imageData: string,
  weekId: WeekId,
  aiSettings: AISettings,
  vaultSettings?: VaultSettings,
): Effect.Effect<ScanState, never> =>
  Effect.tryPromise({
    try: async () =>
      extractHandwriting({
        imageBase64: imageData,
        weekId,
        provider: aiSettings.provider,
        googleApiKey: aiSettings.googleApiKey,
        ollamaEndpoint: aiSettings.ollamaEndpoint,
        vaultSettings,
      }),
    catch: (error): Error =>
      error instanceof Error
        ? error
        : new Error('Unknown error during extraction'),
  }).pipe(
    Effect.flatMap((result): Effect.Effect<ScanState, never> => {
      if (!result.success) {
        return Effect.succeed({
          status: 'error' as const,
          error: result.error,
        });
      }

      const entries: ExtractedEntry[] = result.data.entries.map(
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
    Effect.catchAll((error: Error) =>
      Effect.succeed<ScanState>({
        status: 'error' as const,
        error: error.message,
      }),
    ),
  );
