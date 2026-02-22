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

  const upload = useCallback((file: File): Promise<void> => {
    setState({ status: 'uploading', progress: 0 });
    return Effect.runPromise(
      readFileAsDataUrl(file, (progress) =>
        setState({ status: 'uploading', progress }),
      ).pipe(
        Effect.tap((data) =>
          Effect.sync(() => {
            setImagePreview(data);
            setImageData(data);
            setState({ status: 'idle' });
          }),
        ),
        Effect.catchAll((error) =>
          Effect.sync(() =>
            setState({ status: 'error', error: error.message }),
          ),
        ),
        Effect.asVoid,
      ),
    );
  }, []);

  const process = useCallback((): Promise<ScanState> => {
    if (!imageData) {
      const nextState: ScanState = {
        status: 'error',
        error: 'No image to process',
      };
      setState(nextState);
      return Promise.resolve(nextState);
    }

    setState({ status: 'processing' });
    return Effect.runPromise(
      processExtractionEffect(
        imageData,
        weekId,
        options.aiSettings,
        options.vaultSettings,
      ).pipe(Effect.tap((nextState) => Effect.sync(() => setState(nextState)))),
    );
  }, [imageData, weekId, options.aiSettings, options.vaultSettings]);

  const clear = useCallback((): void => {
    setState({ status: 'idle' });
    setImagePreview(null);
    setImageData(null);
  }, []);

  return { state, imagePreview, upload, process, clear };
};
