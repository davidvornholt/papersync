'use client';

import { Effect } from 'effect';
import { useCallback, useState } from 'react';
import {
  getCurrentWeekId,
  processExtractionEffect,
  readFileAsDataUrl,
} from './use-scan-effects';
import type {
  ScanState,
  UseScanOptions,
  UseScanReturn,
} from './use-scan-types';

export type {
  AISettings,
  ExtractedEntry,
  ScanState,
  UseScanOptions,
  UseScanReturn,
} from './use-scan-types';

export const useScan = (options: UseScanOptions): UseScanReturn => {
  const [state, setState] = useState<ScanState>({ status: 'idle' });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const weekId = options.weekId ?? getCurrentWeekId();

  const upload = useCallback(async (file: File): Promise<void> => {
    setState({ status: 'uploading', progress: 0 });
    const result = await Effect.runPromise(
      readFileAsDataUrl(file, (progress) =>
        setState({ status: 'uploading', progress }),
      ).pipe(
        Effect.map((data) => ({ success: true as const, data })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );

    if (result.success) {
      setImagePreview(result.data);
      setImageData(result.data);
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'error', error: result.error });
  }, []);

  const process = useCallback(async (): Promise<ScanState> => {
    if (!imageData) {
      const nextState: ScanState = {
        status: 'error',
        error: 'No image to process',
      };
      setState(nextState);
      return nextState;
    }

    setState({ status: 'processing' });
    const nextState = await Effect.runPromise(
      processExtractionEffect(
        imageData,
        weekId,
        options.aiSettings,
        options.vaultSettings,
      ),
    );
    setState(nextState);
    return nextState;
  }, [imageData, weekId, options.aiSettings, options.vaultSettings]);

  const clear = useCallback((): void => {
    setState({ status: 'idle' });
    setImagePreview(null);
    setImageData(null);
  }, []);

  return { state, imagePreview, upload, process, clear };
};
