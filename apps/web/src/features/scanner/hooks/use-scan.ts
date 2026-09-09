'use client';

import { Effect, Schema } from 'effect';
import { useRef, useState } from 'react';
import { getImageWeek } from '@/features/scanner/services/image-week';
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
  const [hasDetectedWeek, setHasDetectedWeek] = useState(false);
  const revisionRef = useRef(0);

  const clear = () => {
    revisionRef.current += 1;
    setState({ status: 'idle' });
    setImagePreview(null);
    setWeek(null);
    setHasDetectedWeek(false);
  };

  const upload = (file: File): Promise<boolean> => {
    clear();
    const currentRevision = revisionRef.current;
    setState({ status: 'uploading', progress: 0 });
    return Effect.runPromise(
      Effect.all(
        [
          readFileAsDataUrl(file, (progress) => {
            if (currentRevision === revisionRef.current) {
              setState({ status: 'uploading', progress });
            }
          }),
          getImageWeek(file),
        ],
        { concurrency: 'unbounded' },
      ).pipe(
        Effect.map(([data, payload]) => {
          if (currentRevision !== revisionRef.current) {
            return false;
          }
          setImagePreview(data);
          setWeek(payload?.week ?? null);
          setHasDetectedWeek(payload !== null);
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
    if (!(imagePreview && weekId)) {
      const nextState: ScanState = {
        status: 'error',
        error: 'Choose an image and the week printed on the sheet.',
      };
      setState(nextState);
      return Promise.resolve(nextState);
    }
    setState({ status: 'processing' });
    return Effect.runPromise(
      processExtractionEffect(
        imagePreview,
        weekId,
        options.aiSettings,
        options.vaultSettings,
      ).pipe(
        Effect.map((nextState): ScanState => {
          if (currentRevision !== revisionRef.current) {
            return { status: 'idle' };
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
    setHasDetectedWeek(false);
    setState({ status: 'idle' });
  };

  return {
    state,
    weekId,
    hasDetectedWeek,
    setWeekId,
    imagePreview,
    upload,
    process,
    clear,
  };
};
