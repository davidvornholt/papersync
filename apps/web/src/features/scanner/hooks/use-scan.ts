'use client';

import { Effect, Schema } from 'effect';
import { useRef, useState } from 'react';
import { WeekId } from '@/shared/types/schemas';
import { processExtractionEffect, readFileAsDataUrl } from './use-scan-effects';
import type {
  ScanState,
  UseScanOptions,
  UseScanReturn,
} from './use-scan-types';
export const useScan = (options: UseScanOptions): UseScanReturn => {
  const [state, setState] = useState<ScanState>({ status: 'idle' });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [weekId, setWeek] = useState<WeekId | null>(null);
  const revisionRef = useRef(0);

  const clear = () => {
    revisionRef.current += 1;
    setState({ status: 'idle' });
    setImagePreview(null);
    setWeek(null);
  };

  const upload = (file: File): Promise<boolean> => {
    clear();
    const currentRevision = revisionRef.current;
    setState({ status: 'uploading', progress: 0 });
    return Effect.runPromise(
      readFileAsDataUrl(file, (progress) => {
        if (currentRevision === revisionRef.current) {
          setState({ status: 'uploading', progress });
        }
      }).pipe(
        Effect.map((data) => {
          if (currentRevision !== revisionRef.current) {
            return false;
          }
          setImagePreview(data);
          setState({ status: 'idle' });
          return true;
        }),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            if (currentRevision === revisionRef.current) {
              setState({ status: 'error', error: error.message });
            }
            return false;
          }),
        ),
      ),
    );
  };

  const process = (): Promise<ScanState> => {
    revisionRef.current += 1;
    const currentRevision = revisionRef.current;
    if (!imagePreview) {
      const nextState: ScanState = {
        status: 'error',
        error: 'Choose an image of the sheet.',
      };
      setState(nextState);
      return Promise.resolve(nextState);
    }
    setState({ status: 'processing' });
    return Effect.runPromise(
      processExtractionEffect(imagePreview, weekId, options.aiSettings).pipe(
        Effect.map((nextState): ScanState => {
          if (currentRevision !== revisionRef.current) {
            return { status: 'idle' };
          }
          if (nextState.status === 'complete') {
            setWeek(nextState.weekId);
          }
          setState(nextState);
          return nextState;
        }),
      ),
    );
  };

  const setWeekId = (value: string) => {
    revisionRef.current += 1;
    setWeek(Schema.is(WeekId)(value) ? value : null);
    setState({ status: 'idle' });
  };

  return {
    state,
    weekId,
    setWeekId,
    imagePreview,
    upload,
    process,
    clear,
  };
};
