'use client';
import { Effect } from 'effect';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/shared/components/use-toast';
import { useSettings } from '@/shared/hooks/use-settings';
import { requestAction } from '@/shared/http/action';
import { useScan } from '../../hooks/use-scan';
import { useScanImagePaste } from './use-scan-image-paste';
import { useScanSave } from './use-scan-save';

export const useScanScreen = () => {
  const { settings, isLoading, loadError } = useSettings();
  const { addToast } = useToast();
  const scan = useScan({ aiSettings: settings.ai, notify: addToast });
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();
  const shareFailed = useSearchParams().get('shared') === 'failed';
  useEffect(() => {
    if (shareFailed) {
      addToast(
        'PaperSync could not receive the shared photos. Share them again.',
        'error',
      );
      router.replace('/scan');
    }
  }, [shareFailed, addToast, router]);
  const saving = useScanSave({ scan });
  const isSettingUp =
    isLoading || loadError !== null || scan.isRestoring || scan.isClearing;
  // Photos and the week stay editable during review; analysis locks them.
  const isCaptureLocked =
    isSettingUp ||
    scan.isPreparing ||
    scan.state.status === 'processing' ||
    saving.isSyncing ||
    scan.isUpdatingWeek;
  const isReviewLocked = isSettingUp || saving.isSyncing || scan.isUpdatingWeek;
  useScanImagePaste({
    onFilesSelect: scan.addPages,
    isDisabled: isCaptureLocked,
  });
  const handleScanFromDevice = (imageData: string) => {
    Effect.runFork(
      requestAction(() => fetch(imageData)).pipe(
        Effect.flatMap((response) => requestAction(() => response.blob())),
        Effect.tap((blob) => Effect.sync(() => scan.addPages([blob]))),
        Effect.catchAll((error) =>
          Effect.sync(() => addToast(error.message, 'error')),
        ),
      ),
    );
  };
  return {
    scan,
    loadError,
    isCaptureLocked,
    isReviewLocked,
    isDragging,
    setIsDragging,
    ...saving,
    handleScanFromDevice,
  };
};
